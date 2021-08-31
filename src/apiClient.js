const { getOctokit } = require("@actions/github");

class ApiClient {
  constructor(token, { repoName, repoOwner, dryRun = false, log = (message) => {} }) {
    this.octokit = getOctokit(token);
    this.repoName = repoName;
    this.repoOwner = repoOwner;
    this.dryRun = dryRun
    this.log = log
  }

  async getAllIssues(issueLabels) {
    const issuesPerPage = 100;
    const labels = issueLabels ? { labels: issueLabels } : {};
    const allIssues = await this.octokit.paginate(
      this.octokit.rest.issues.listForRepo,
      {
        owner: this.repoOwner,
        repo: this.repoName,
        state: "open",
        sort: "updated",
        direction: "desc",
        per_page: issuesPerPage,
        ...labels,
      }
    );

    return allIssues.filter((issue) => !issue.pull_request);
  }

  async addLabel(issue, label) {
    try {
      const params = {
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: issue.number,
        labels: [...issue.labels, label],
      };

      if (!this.dryRun) {
        await this.octokit.rest.issues.update(params);
      } else {
        this.log(`Adding label to #${issue.number}`);
      }
      return true;
    } catch (e) {
      this.log(`Error while adding label to #${issue.number}: ${e.message}`);
      return false;
    }
  }

  async postComment(issue, comment) {
    try {
      const params = {
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: issue.number,
        body: comment,
      };

      if (!this.dryRun) {
        await this.octokit.rest.issues.createComment(params);
      } else {
        this.log(`Posting comment to #${issue.number}`);
      }
      return true;
    } catch (e) {
      this.log(`Error while posting comment to #${issue.number}: ${e.message}`)
      return false;
    }
  }

  async closeIssue(issue) {
    try {
      const params = {
        owner: this.repoOwner,
        repo: this.repoName,
        issue_number: issue.number,
        state: "closed",
      };

      if (!this.dryRun) {
        await this.octokit.rest.issues.update(params);
      } else {
        this.log(`Closing #${issue.number}`)
      }
      return true;
    } catch (e) {
      this.log(`Error while closing issue #${issue.number}: ${e.message}`)
      return false;
    }
  }
}

module.exports = ApiClient