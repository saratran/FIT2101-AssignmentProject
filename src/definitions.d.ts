interface Contribution {
  commitCount: number;
  lineChangeCount: number;
}

interface Contributor {
  username: string;
  email: string;
  name: string;
  contribution: Contribution;
}

interface FileInfo {
  filename: string;
  // lineCount: number;
  yourContributions: Contribution;
  otherContributors: Contributor[];
}

interface Repo {
  name: string;
  url: string;
  description: string;
}