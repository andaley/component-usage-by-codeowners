# Usage By Codeowner Scanner

A node script built on top of [react-scanner](https://github.com/moroshko/react-scanner) that will help you understand which teams are using your design system components the most. The script scans your codebase to analyze design system component usage by GitHub [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#example-of-a-codeowners-file).

## Features

- Uses [react-scanner](https://github.com/moroshko/react-scanner) to scan your codebase for design system component usage
- Maps component usage to teams based on CODEOWNERS file
- Generates results in a JSON file

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/component-usage-by-codeowners.git

# Install dependencies
cd component-usage-by-codeowners
npm install
```

## Usage

```bash
npm run scan [options]
```

### Options

- `-c, --config <path>` - Path to react-scanner config file (required)
- `-o, --output <path>` - Output path for the report. Can be a file or directory
- `--codeowners <path>` - Path to CODEOWNERS file (required)
- `-d, --debug` - Enable debug logging

### Example

```bash
npm run scan -c react-scanner.config.js -o ./output/usage-by-codeowner.json --codeowners ./CODEOWNERS
```

## Configuration

### React Scanner Config

See [react-scanner documentation](https://github.com/moroshko/react-scanner?tab=readme-ov-file#config-options) for setting up a react-scanner config. You can also view the sample config file in [`test-files/sample-codebase/react-scanner.config.js`](test-files/sample-codebase/react-scanner.config.js).

## Output Format

The tool generates a JSON report with the following structure:

```json
{
  "ComponentName": {
    "@team-name": numberOfUsages
  }
}
```

Example output:
```json
{
  "Button": {
    "@frontend-team": 3,
    "@design-system-team": 1
  },
  "Card": {
    "@frontend-team": 2
  }
}
```

## Development

### Testing

The repository includes a [sample codebase](test-files/sample-codebase) for testing the scanner.

To run the scanner against the sample codebase:

```bash
npm run test-scan
```
