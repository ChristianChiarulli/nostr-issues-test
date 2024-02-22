import github from "@actions/github";
import core from "@actions/core";
import { finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import * as nip19 from "nostr-tools/nip19";

type Issue = {
  content: string;
  tags: string[][];
};

// TODO: add everything about issue to the tags
async function getIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
) {
  const octokit = github.getOctokit(token);

  const { data } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
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

  const issue: Issue = {
    content: data.body || "",
    tags: issueTags,
  };

  return issue;
}

async function publishIssueToNostr() {
  // TODO: clean up input validation

  try {
    const token = process.env.GITHUB_TOKEN || core.getInput("token");
    if (!token) {
      core.setFailed("token input is required");
      return;
    }
    // let repo = process. core.getInput("repo").split("/");
    let repo: string | string[] = process.env.REPO || core.getInput("repo");
    repo = repo.split("/");
    if (repo.length !== 2 || !repo[0] || !repo[1]) {
      core.setFailed("repo input is invalid");
      return;
    }

    let issueNumber: string | number =
      process.env.ISSUE_NUMBER || core.getInput("issue_number");
    if (!issueNumber || isNaN(parseInt(issueNumber))) {
      core.setFailed("issue_number input is required");
      return;
    }
    issueNumber = parseInt(issueNumber);

    let nsec = process.env.NSEC || core.getInput("nsec");
    if (!nsec) {
      core.setFailed("nsec input is required");
      return;
    }

    let decodeResult = nip19.decode(nsec);
    if (!decodeResult || decodeResult.type !== "nsec") {
      core.setFailed("nsec input is invalid");
      return;
    }

    let sk = decodeResult.data as Uint8Array;

    let kind: string | number = process.env.KIND || core.getInput("kind");

    if (!kind || isNaN(parseInt(kind))) {
      core.setFailed("kind input is required");
      return;
    }

    kind = parseInt(kind);

    let tags: undefined | string | string[][];
    try {
      tags = process.env.TAGS || core.getInput("tags");
      tags = JSON.parse(tags) as string[][];
    } catch (error: any) {
      core.setFailed("tags input is invalid");
      return;
    }

    let relays: undefined | string | string[];
    try {
      relays = process.env.RELAYS || core.getInput("relays");
      relays = JSON.parse(relays) as string[];
    } catch (error: any) {
      core.setFailed("relays input is invalid");
      return;
    }

    if (relays.length === 0) {
      core.setFailed("relays input is invalid");
      return;
    }

    const issue = await getIssue(token, repo[0], repo[1], issueNumber);

    tags = tags.concat(issue.tags);

    console.log("tags: ", tags);

    let eventTemplate = {
      kind: kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: tags,
      content: issue.content,
    };

    const signedEvent = finalizeEvent(eventTemplate, sk);

    const verified = verifyEvent(signedEvent);
    console.log("verified: ", verified);

    console.log("signed event: ", signedEvent);

    const pool = new SimplePool();
    const publishedEvent = await Promise.any(pool.publish(relays, signedEvent));

    console.log("published to at least one relay!");
    console.log("published event: ", publishedEvent);

    pool.close(relays);

    // Add more fields as needed
  } catch (error: any) {
    core.setFailed(`Failed to fetch issue details: ${error.message}`);
  }
}

publishIssueToNostr();
