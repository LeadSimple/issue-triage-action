/* eslint-disable no-throw-literal */

const core = require('@actions/core');
const { isOlderThan, getDaysSince } = require('./utils');

class ActionIssueTriage {
  constructor(apiClient, { log, ...options }) {
    this.apiClient = apiClient;
    this.opts = options;
    this.log = log
  }

  async run() {
    const allIssues = await this._getAllIssues();

    if (!allIssues.length) {
      this.log(`No issues found`);
      return;
    }

    this.log(`Total issues: ${allIssues.length}`);

    const staleIssues = this._filterIssuesToMarkAsStale(allIssues);
    const markedStale = await this._countSuccessful((issue) => this._markAsStale(issue), staleIssues);

    const issuesToClose = this._filterIssuesToClose(allIssues);
    const closed = await this._countSuccessful((issue) => this._closeIssue(issue), issuesToClose)

    if (markedStale) {
      this.log(`Issues marked as stale: ${markedStale}`);
    }
    if (closed) {
      this.log(`Issues closed down: ${closed}`);
    }
    if (!markedStale && !closed) {
      this.log(`No old issues found, sweet!`);
    }
  }

  async _getAllIssues() {
    try {
      return await this.apiClient.getAllIssues(this.opts.issueLabels);
    } catch (e) {
      core.error(`Error while fetching issues: ${e.message}`);
      return [];
    }
  }

  _filterIssuesToMarkAsStale(issues) {
    if (
      this.opts.closeAfter > 0 && // closing issues enabled
      this.opts.closeAfter <= this.opts.staleAfter // we're closing the issue before making it stale
    ) {
      return [];
    }

    return issues
      .filter(issue => isOlderThan(this._baseDate(issue), this.opts.staleAfter))
      .filter(issue => !this._isMarkedAsStale(issue));
  }

  _filterIssuesToClose(issues) {
    if (this.opts.closeAfter === 0) {
      return [];
    }

    return issues.filter(issue =>
      isOlderThan(this._baseDate(issue), this.opts.closeAfter)
    );
  }

  async _countSuccessful(action, issues) {
    let count = 0
    for (const issue of issues) {
      if (await action(issue)) {
        count++
      }
    }
    return count
  }

  async _markAsStale(issue) {
    this.log(`Marking #${issue.number} as stale.`)
    const comment = this._generateMessage(issue, this.opts.staleComment);
    if (!(await this.apiClient.postComment(issue, comment))) {
      core.warning(`Could not post comment for #${issue.number}.`);
      return false;
    }

    if (!(await this.apiClient.addLabel(issue, this.opts.staleLabel))) {
      core.warning(`Could not mark issue #${issue.number} as stale.`);
      return false
    }

    return true;
  }

  async _closeIssue(issue) {
    this.log(`Closing #${issue.number}.`)
    const comment = this._generateMessage(issue, this.opts.closeComment);
    if (!(await this.apiClient.postComment(issue, comment))) {
      core.warning(`Could not post comment for #${issue.number}.`);
      return false
    }

    if (!(await this.apiClient.closeIssue(issue))) {
      core.warning(`Could not close issue #${issue.number}.`);
      return false
    }

    return true;
  }

  /**
   * %DAYS_OLD% - how old is the issue
   * %AUTHOR% - issue creator
   */
  _generateMessage(issue, messageTemplate) {
    return messageTemplate
      .replace('%DAYS_OLD%', getDaysSince(this._baseDate(issue)))
      .replace('%AUTHOR%', issue.user.login);
  }

  _isMarkedAsStale(issue) {
    return issue.labels.map(label => label.name).includes(this.opts.staleLabel);
  }

  _baseDate(issue) {
    if (this.opts.staleBaseField === 'created_at') {
      return issue.created_at;
    }

    return issue.updated_at;
  }
}

module.exports = ActionIssueTriage;
