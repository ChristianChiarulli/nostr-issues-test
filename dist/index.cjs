"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var import_github = __toESM(require("@actions/github"), 1);
var import_core = __toESM(require("@actions/core"), 1);
var import_pure = require("nostr-tools/pure");
var import_pool = require("nostr-tools/pool");
var nip19 = __toESM(require("nostr-tools/nip19"), 1);
async function getIssue(token, owner, repo, issueNumber) {
  const octokit = import_github.default.getOctokit(token);
  const { data } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  });
  const issueTags = [];
  if (data.title) {
    issueTags.push(["title", `${data.title}`]);
  }
  if (data.repository) {
    issueTags.push(["repo", `${data.repository}`]);
  }
  if (data.state) {
    issueTags.push(["state", `${data.state}`]);
  }
  if (data.labels) {
    issueTags.push(["labels", `${data.labels}`]);
  }
  if (data.assignees) {
    issueTags.push(["assignees", `${data.assignees}`]);
  }
  if (data.assignee) {
    issueTags.push(["assignee", `${data.assignee}`]);
  }
  if (data.milestone) {
    issueTags.push(["milestone", `${data.milestone}`]);
  }
  if (data.comments) {
    issueTags.push(["comments", `${data.comments}`]);
  }
  if (data.body) {
    issueTags.push(["body", `${data.body}`]);
  }
  if (data.created_at) {
    issueTags.push(["created_at", `${data.created_at}`]);
  }
  if (data.updated_at) {
    issueTags.push(["updated_at", `${data.updated_at}`]);
  }
  if (data.closed_at) {
    issueTags.push(["closed_at", `${data.closed_at}`]);
  }
  const issue = {
    content: data.body || "",
    tags: issueTags
  };
  return issue;
}
async function publishIssueToNostr() {
  try {
    const token = process.env.GITHUB_TOKEN || import_core.default.getInput("token");
    if (!token) {
      import_core.default.setFailed("token input is required");
      return;
    }
    let repo = process.env.REPO || import_core.default.getInput("repo");
    repo = repo.split("/");
    if (repo.length !== 2 || !repo[0] || !repo[1]) {
      import_core.default.setFailed("repo input is invalid");
      return;
    }
    let issueNumber = process.env.ISSUE_NUMBER || import_core.default.getInput("issue_number");
    if (!issueNumber || isNaN(parseInt(issueNumber))) {
      import_core.default.setFailed("issue_number input is required");
      return;
    }
    issueNumber = parseInt(issueNumber);
    let nsec = process.env.NSEC || import_core.default.getInput("nsec");
    if (!nsec) {
      import_core.default.setFailed("nsec input is required");
      return;
    }
    let decodeResult = nip19.decode(nsec);
    if (!decodeResult || decodeResult.type !== "nsec") {
      import_core.default.setFailed("nsec input is invalid");
      return;
    }
    let sk = decodeResult.data;
    let kind = process.env.KIND || import_core.default.getInput("kind");
    if (!kind || isNaN(parseInt(kind))) {
      import_core.default.setFailed("kind input is required");
      return;
    }
    kind = parseInt(kind);
    let tags;
    try {
      tags = process.env.TAGS || import_core.default.getInput("tags");
      tags = JSON.parse(tags);
    } catch (error) {
      import_core.default.setFailed("tags input is invalid");
      return;
    }
    let relays;
    try {
      relays = process.env.RELAYS || import_core.default.getInput("relays");
      relays = JSON.parse(relays);
    } catch (error) {
      import_core.default.setFailed("relays input is invalid");
      return;
    }
    if (relays.length === 0) {
      import_core.default.setFailed("relays input is invalid");
      return;
    }
    const issue = await getIssue(token, repo[0], repo[1], issueNumber);
    console.log(`Issue: ${issue}`);
    let eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1e3),
      tags,
      content: issue.content
    };
    const signedEvent = (0, import_pure.finalizeEvent)(eventTemplate, sk);
    const verified = (0, import_pure.verifyEvent)(signedEvent);
    console.log("verified: ", verified);
    console.log("signed event: ", signedEvent);
    const pool = new import_pool.SimplePool();
    const publishedEvent = await Promise.any(pool.publish(relays, signedEvent));
    console.log("published to at least one relay!");
    console.log("published event: ", publishedEvent);
    pool.close(relays);
  } catch (error) {
    import_core.default.setFailed(`Failed to fetch issue details: ${error.message}`);
  }
}
publishIssueToNostr();
