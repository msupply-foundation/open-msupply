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
            label.name: label for label in self.repo.get_labels() if 'team' in label.name
        }

    def get_user_team_label(self) -> str:
        user = self.github.get_user()
        user_teams = set()
        for team in user.get_teams():
            if team.organization == self.org:
                user_teams.add(team.slug)

        for l in self.team_labels:
            if any(word in l for word in user_teams):
                return self.team_labels[l].name
        return ''
    
    def get_team_labels_not_belonging_to_user(self) -> List[str]:
        team_label = self.get_user_team_label()
        not_team_labels = [l for l in self.team_labels if l != team_label]
        return not_team_labels
    
    def get_issue_labels(self) -> List[str]:
        issue = self.repo.get_issue(self.issue_number)
        return [label.name for label in issue.labels]
    
    def add_and_remove_labels(self) -> None:
        issue_labels = self.get_issue_labels()
        user_team_label = self.get_user_team_label()
        not_user_team_labels = self.get_team_labels_not_belonging_to_user()

        issue = self.repo.get_issue(self.issue_number)
        assignees = [a.login for a in issue.assignees]

        if not assignees:
            for label in self.team_labels:
                if label in issue_labels:
                    print(f"Removing team label: {label}")
                    issue.remove_from_labels(label)
            return

        if user_team_label and user_team_label not in issue_labels:
            print(f"Adding team label: {user_team_label}")
            issue.add_to_labels(user_team_label)
        else:
            print(f"🎉🎉🎉")

        for label in not_user_team_labels:
            if label in issue_labels:
                print(f"Removing other team label: {label}")
                issue.remove_from_labels(label)
            else:
                print(f"💃💃💃")

def main():
    github_token = os.getenv('GITHUB_TOKEN')
    repo_name = os.getenv('GITHUB_REPOSITORY')
    issue_num = int(os.getenv('ISSUE_NUMBER', 1))
    
    try:
        team_manager = TeamLabelAndMilestone(github_token, repo_name, issue_num)
        team_manager.add_and_remove_labels()
        print("✅ Labels added and removed successfully.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

