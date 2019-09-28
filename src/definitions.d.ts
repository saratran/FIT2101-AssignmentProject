interface Contribution {
  commitCount: number;
  lineEditCount: number;
}

interface Contributor {
  username: string;
  email: string;
  contribution: Contribution;
}

interface FileInfo {
  filename: string;
  lineCount: number;
  yourContributions: Contribution;
  otherContributors: Contributor[];
}