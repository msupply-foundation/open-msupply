import sys
import os
from typing import List, Set
from github import Github
from datetime import datetime, timezone

class TeamLabelAndMilestone: 
    def __init__(self, github_token: str, repo_name: str, issue_number: int):
        self.github = Github(github_token)
        self.repo = self.github.get_repo(repo_name)
        self.org = self.github.get_organization(repo_name.split('/')[0])
        self.issue_number = issue_number
        self.team_labels = {
            label.name: label for label in self.repo.get_labels() if 'team' in label.name.lower()
        }
        self.opened_milestones = self.repo.get_milestones(state='open')

    def get_assignees_team_labels(self) -> List[str]:
        issue = self.repo.get_issue(self.issue_number)
        assignees = [a for a in issue.assignees]

        assignee_teams: Set[str] = set()
        for assignee in assignees:
            for team in self.org.get_teams():
                team_members = [member.login for member in team.get_members()]
                if assignee.login in team_members:
                    assignee_teams.add(team.slug)

        return [label for label in self.team_labels if any(word.lower() in label.lower() for word in assignee_teams)]

    def get_team_labels_not_belonging_to_assignees(self) -> List[str]:
        team_label = self.get_assignees_team_labels()
        return [label for label in self.team_labels if label.lower() not in [l.lower() for l in team_label]]

    def get_issue_labels(self) -> List[str]:
        issue = self.repo.get_issue(self.issue_number)
        return [label.name for label in issue.labels]

    def add_and_remove_labels(self) -> None:
        issue_labels = self.get_issue_labels()
        user_team_label = self.get_assignees_team_labels()
        not_user_team_labels = self.get_team_labels_not_belonging_to_assignees()
        milestone = self.repo.get_issue(self.issue_number).milestone

        issue = self.repo.get_issue(self.issue_number)
        assignees = issue.assignees

        if not assignees and not milestone:
            for label in self.team_labels:
                if label in issue_labels:
                    print(f"Removing team label: {label}")
                    issue.remove_from_labels(label)
            return

        for label in user_team_label:
            if label not in issue_labels:
                print(f"Adding team label: {label}")
                issue.add_to_labels(label)
            else:
                print(f"🎉🎉🎉")

        labels_to_remove = [label for label in issue_labels if label in not_user_team_labels or "triage" in label]
        for label in labels_to_remove:
            if label in not_user_team_labels:
                print(f"Removing other team label: {label}")
            if "triage" in label:
                print(f"Removing triage label: {label}")
            issue.remove_from_labels(label)

    def assign_next_milestone_from_cooldown(self) -> None:
        issue = self.repo.get_issue(self.issue_number)
        assignees = [a.login for a in issue.assignees]

        if not assignees:
            return
        if not self.opened_milestones:
            return

        if not issue.milestone or 'cooldown' in issue.milestone.title.lower():
            today = datetime.now(timezone.utc)
            future_milestone = None
            for milestone in self.opened_milestones:
                if milestone.due_on and milestone.due_on > today:
                    if not future_milestone or milestone.due_on > future_milestone.due_on:
                        future_milestone = milestone

            if future_milestone:
                print(f"Assigning next milestone: {future_milestone.title}")
                issue.edit(milestone=future_milestone)
            else:
                print("❌ Can't find feature milestone.")

def main():
    github_token = os.getenv('GITHUB_TOKEN')
    repo_name = os.getenv('GITHUB_REPOSITORY')
    issue_num = int(os.getenv('ISSUE_NUMBER', 1))

    try:
        team_manager = TeamLabelAndMilestone(github_token, repo_name, issue_num)
        team_manager.add_and_remove_labels()
        team_manager.assign_next_milestone_from_cooldown()

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()