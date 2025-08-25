import "dotenv/config";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { Octokit } from "@octokit/rest";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// --- Configuration & Clients ---
const config = {
  ai: {
    token: process.env["GH_AI_TOKEN"] || process.env["GITHUB_TOKEN"],
    endpoint: "https://models.github.ai/inference",
  },
  github: {
    token: process.env["GITHUB_TOKEN"],
    commentBody: process.env["COMMENT_BODY"],
    issueNumber: parseInt(process.env["ISSUE_NUMBER"], 10),
    repoOwner: process.env["REPO_OWNER"],
    repoName: process.env["REPO_NAME"],
  },
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const octokit = new Octokit({ auth: config.github.token });
const aiClient = ModelClient(config.ai.endpoint, new AzureKeyCredential(config.ai.token));

// --- Validation ---
if (!config.ai.token) {
  console.error("Error: Neither GH_AI_TOKEN nor GITHUB_TOKEN found for AI authentication.");
  process.exit(1);
}
if (!config.github.token || !config.github.commentBody || !config.github.issueNumber || !config.github.repoOwner || !config.github.repoName) {
  console.error("Error: Missing required GitHub context from the workflow.");
  // This indicates a workflow configuration error.
  process.exit(1);
}

/**
 * Posts or updates a comment on the GitHub issue.
 * @param {string} body - The text to post as a comment.
 * @param {number|null} processingCommentId - ID of processing comment to update, if available.
 */
async function postCommentToIssue(body, processingCommentId = null) {
  console.log(`postCommentToIssue called with processingCommentId: ${processingCommentId}`);
  
  // Update processing comment if we have the ID
  if (processingCommentId) {
    try {
      console.log(`Attempting to update comment ${processingCommentId}`);
      await octokit.issues.updateComment({
        owner: config.github.repoOwner,
        repo: config.github.repoName,
        comment_id: processingCommentId,
        body: body,
      });
      console.log(`Successfully updated processing comment ${processingCommentId} with AI response.`);
      return;
    } catch (error) {
      console.error(`Error updating processing comment ${processingCommentId}: ${error.message}`);
      console.error(`Error details:`, error);
    }
  } else {
    console.log("No processingCommentId provided, will create new comment");
  }
  
  // Fallback: create new comment
  console.log("Creating new comment as fallback");
  await octokit.issues.createComment({
    owner: config.github.repoOwner,
    repo: config.github.repoName,
    issue_number: config.github.issueNumber,
    body: body,
  });
  console.log(`Successfully posted a comment to issue #${config.github.issueNumber}.`);
}

/**
 * Loads the system prompt.
 * 1. Checks for AI_SYSTEM_PROMPT_PATH env var and loads from that file.
 * 2. Checks for a file at `.github/prompts/prompt.md` in the workspace and loads it.
 * 3. Checks for AI_SYSTEM_PROMPT env var and uses its content.
 * 4. Falls back to a hardcoded default prompt.
 * @returns {string} The system prompt content.
 */
function getSystemPrompt() {
    const defaultPrompt = "You are a helpful assistant integrated into GitHub issues. The user is commenting on an issue. Provide your answer in the context of the original issue description provided below.";
    const customPath = process.env.AI_SYSTEM_PROMPT_PATH;
    const defaultPath = path.join(process.env.GITHUB_WORKSPACE || '.', '.github', 'prompts', 'prompt.md');

    if (customPath && fs.existsSync(customPath)) {
        console.log(`Loading system prompt from custom path: ${customPath}`);
        return fs.readFileSync(customPath, 'utf-8');
    }

    if (fs.existsSync(defaultPath)) {
        console.log(`Loading system prompt from default path: ${defaultPath}`);
        return fs.readFileSync(defaultPath, 'utf-8');
    }

    const envPrompt = process.env["AI_SYSTEM_PROMPT"];
    if (envPrompt) {
        console.log("Loading system prompt from AI_SYSTEM_PROMPT environment variable.");
        return envPrompt;
    }

    console.log("Using default system prompt.");
    return defaultPrompt;
}

/**
 * Loads and parses the model mapping file.
 * @returns {object} The model map object.
 */
function loadModelMap() {
    const mapPath = path.join(__dirname, '../../model-map.json');
    if (!fs.existsSync(mapPath)) {
        // This is a fatal error for the action itself, as the file should be co-located.
        throw new Error('CRITICAL: model-map.json not found in the action directory.');
    }
    const fileContent = fs.readFileSync(mapPath, 'utf-8');
    return JSON.parse(fileContent);
}

/**
 * Gets a response from the AI model.
 * @param {string} prompt - The user's prompt for the AI.
 * @param {object} issueContext - The context of the issue.
 * @param {string} systemPrompt - The system prompt to use.
 * @param {string} modelIdentifier - The full model identifier to use for the API call.
 * @returns {Promise<string>} The AI's response content.
 */
async function getAiResponse(prompt, issueContext, systemPrompt, modelIdentifier) {
  const systemMessage = `${systemPrompt}

--- Issue Context ---
Title: ${issueContext.title}
Body: ${issueContext.body}

--- Conversation History ---
The following is a JSON array of the conversation history on this issue:
- "role": "user" = regular user comment
- "role": "user_prompt" = user's AI prompt (started with /ai)
- "role": "assistant" = your previous AI responses

${issueContext.comments || "[]"}
--- End Context ---`;

  const response = await aiClient.path("/chat/completions").post({
    body: {
      messages: [
        { role: "system", content: systemMessage.trim() },
        { role: "user", content: prompt },
      ],
      temperature: 0.7, // Adjusted for more factual responses
      top_p: 1.0,
      model: modelIdentifier,
    },
  });
  
  if (isUnexpected(response)) {
    console.error("Azure AI API Error:", response.body.error);
    throw new Error(`AI API call failed: ${response.body.error.message}`);
  }

  return response.body.choices[0].message.content;
}

/**
 * Fetches the context (title, body, and all comments) of the current issue.
 * @returns {Promise<{title: string, body: string, comments: string}>}
 */
async function getIssueContext() {
  const { data: issue } = await octokit.issues.get({
    owner: config.github.repoOwner,
    repo: config.github.repoName,
    issue_number: config.github.issueNumber,
  });
  console.log(`Fetched context for issue #${config.github.issueNumber}.`);

  const issueBody = issue.body || "This issue has no description.";
  
  // Fetch all comments for the issue
  const { data: comments } = await octokit.issues.listComments({
    owner: config.github.repoOwner,
    repo: config.github.repoName,
    issue_number: config.github.issueNumber,
  });
  
  // Format comments as conversation JSON
  let commentsText = "";
  
  if (comments.length > 0) {
    const conversationHistory = comments.map(comment => {
      const isUserPrompt = comment.body.trim().startsWith('/ai ');
      const isAIResponse = comment.body.includes('<!-- AI_RESPONSE -->');
      
      let role = "user";
      let content = comment.body;
      
      if (isUserPrompt) {
        role = "user_prompt";
        content = comment.body.substring(4).trim(); // Remove '/ai ' prefix
      } else if (isAIResponse) {
        role = "assistant";
        // Remove @mention and AI marker
        content = comment.body
          .replace(/^@[\w-]+\s*\n*/, '')
          .replace(/\n*<!-- AI_RESPONSE -->\s*$/, '')
          .trim();
      }
      
      return {
        role: role,
        author: comment.user.login,
        timestamp: comment.created_at,
        content: content
      };
    });
    
    commentsText = JSON.stringify(conversationHistory, null, 2);
  }
  
  console.log(`\n--- Issue Details ---`);
  console.log(`Title: ${issue.title}`);
  console.log(`Body Preview: ${issueBody.substring(0, 200)}...`);
  console.log(`Comments Count: ${comments.length}`);
  console.log(`---------------------\n`);

  return { title: issue.title, body: issueBody, comments: commentsText };
}

async function main() {
  const commentText = config.github.commentBody.trim();
  // The workflow 'if' condition should handle this, but it's good practice to check.
  if (!commentText.startsWith('/ai ')) {
      console.log("Comment does not start with '/ai ', skipping.");
      return;
  }

  const modelMap = loadModelMap();
  const commandContent = commentText.substring(4).trim();
  const parts = commandContent.split(/\s+/);
  
  let modelAlias;
  let prompt;
  let modelIdentifier;

  const potentialAlias = parts[0].toLowerCase();
  // Check if the first word is a known model alias.
  if (modelMap[potentialAlias]) {
      modelAlias = potentialAlias;
      modelIdentifier = modelMap[modelAlias];
      prompt = parts.slice(1).join(' ');
      console.log(`Explicit model alias '${modelAlias}' detected.`);
  } else {
      // If not, assume the whole command is the prompt and use the default model.
      modelAlias = 'default';
      modelIdentifier = modelMap.default;
      prompt = commandContent;
      console.log("No specific model alias detected, using default model.");
  }

  // This would happen if 'default' is missing from model-map.json and no alias was provided.
  if (!modelIdentifier) {
    const availableAliases = `\`${Object.keys(modelMap).filter(k => k !== 'default').join('`, `')}\``;
    await postCommentToIssue(`I could not find a model to use. Please specify one or ensure a "default" is configured.\n\nAvailable models: ${availableAliases}`);
    return;
  }

  if (!prompt) {
    const availableAliases = `\`${Object.keys(modelMap).filter(k => k !== 'default').join('`, `')}\``;
    await postCommentToIssue(`It looks like you used the \`/ai\` command without a question. Please provide a prompt.\n\n**Usage:**\n* \`/ai <your prompt>\` (uses default model)\n* \`/ai <model> <your prompt>\`\n\n**Available models:** ${availableAliases}`);
    console.log("Posted a help message because the prompt was empty.");
    return;
  }
  
  console.log(`Received prompt for issue #${config.github.issueNumber} using model '${modelAlias}' (${modelIdentifier}): "${prompt}"`);

  const systemPrompt = getSystemPrompt();
  const issueContext = await getIssueContext();
  const aiResponse = await getAiResponse(prompt, issueContext, systemPrompt, modelIdentifier);

  // Debug: Log the raw AI response  
  console.log("=== RAW AI RESPONSE ===");
  const aiLines = aiResponse.split('\n');
  console.log("First line:", aiLines[0]);
  console.log("Second line:", aiLines[1]);
  console.log("========================");

  // Get the username of who posted the /ai comment
  const commentAuthor = process.env["COMMENT_AUTHOR"] || "User";
  const responseWithTag = `@${commentAuthor}\n\n${aiResponse}\n\n<!-- AI_RESPONSE -->`;
  
  console.log("=== FINAL RESPONSE WITH TAG ===");
  const finalLines = responseWithTag.split('\n');
  console.log("First line:", finalLines[0]);
  console.log("Second line:", finalLines[1]);
  console.log("Third line:", finalLines[2]);
  console.log("===============================");

  // Get processing comment ID from environment variable (passed from workflow)
  const processingCommentId = process.env["PROCESSING_COMMENT_ID"] ? parseInt(process.env["PROCESSING_COMMENT_ID"], 10) : null;
  console.log(`Using processing comment ID from environment: ${processingCommentId}`);
  
  await postCommentToIssue(responseWithTag, processingCommentId);
}

main().catch((err) => {
  console.error("The script encountered a fatal error:", err);

  // If the error is a 404 from GitHub, the issue/repo likely doesn't exist.
  // In this case, don't try to post another comment.
  if (err.status === 404) {
    console.error("\n[Hint] A '404 Not Found' error from GitHub usually means the repository or issue number in your .env file is incorrect or you don't have access. Please double-check REPO_OWNER, REPO_NAME, and ISSUE_NUMBER.");
  } else {
    // For other errors, try to post a notification back to the issue.
    postCommentToIssue(`> [!CAUTION]\n> Sorry, I encountered an error and could not process your request:\n> \`${err.message}\``)
      .catch(postErr => console.error("Failed to post error comment to issue:", postErr));
  }

  process.exit(1);
});