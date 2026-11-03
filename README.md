# Domain Availability Checker

A simple Node.js script to check `.com.br` domain availability using Registro.br.

The script reads domains from a CSV file, checks their availability, and exports the results to a single CSV file, with available domains listed first.

## Features

- Check `.com.br` domain availability via Registro.br
- Import domains from a CSV file
- Export results to a single CSV file
- Automatically sort available domains to the top
- Save progress after every check
- Resume interrupted checks without starting over
- Retry failed requests
- Stop when rate-limited
- No external dependencies

## Requirements

- Node.js 18 or higher

## Project Structure

```text
domain-checker/
├── check-domains.mjs
├── domains.csv
├── domain-results.csv
└── README.md
```

`domain-results.csv` is generated automatically when the script runs.

## Getting Started

### 1. Prepare your domains

Create a `domains.csv` file containing the domains you want to check.

```csv
domain
imobly.com.br
imobify.com.br
imobix.com.br
moriva.com.br
domora.com.br
```

All domains must use the `.com.br` extension.

### 2. Run the script

```bash
node check-domains.mjs
```

No installation or additional packages are required.

### 3. View the results

The script automatically generates `domain-results.csv`.

```csv
domain,status,code
domora.com.br,AVAILABLE,0
moriva.com.br,AVAILABLE,0
imobify.com.br,REGISTERED,2
imobix.com.br,REGISTERED,2
imobly.com.br,REGISTERED,2
```

_The example above is illustrative and does not represent verified domain availability._

Results are sorted by status, with domains alphabetically ordered within each group.

## Domain Statuses

| Status       | Description                            |
| ------------ | -------------------------------------- |
| `AVAILABLE`  | Domain reported as available           |
| `REGISTERED` | Domain reported as registered          |
| `UNKNOWN`    | Unrecognized response from Registro.br |
| `ERROR`      | Request failed or was rate-limited     |

## Configuration

You can adjust the following constants in `check-domains.mjs`:

```javascript
const INPUT_FILE = "domains.csv";
const OUTPUT_FILE = "domain-results.csv";

const DELAY_MS = 4000;
const MAX_RETRIES = 2;
```

| Option        | Description                                        |
| ------------- | -------------------------------------------------- |
| `INPUT_FILE`  | CSV file containing domains                        |
| `OUTPUT_FILE` | CSV file used to save results                      |
| `DELAY_MS`    | Delay between requests in milliseconds             |
| `MAX_RETRIES` | Number of retries after the initial failed request |

## Resume Previous Checks

Progress is saved automatically after every domain check.

If the script is interrupted, simply run it again:

```bash
node check-domains.mjs
```

The script will:

1. Load existing results from `domain-results.csv`.
2. Skip domains already marked as `AVAILABLE` or `REGISTERED`.
3. Retry domains marked as `UNKNOWN` or `ERROR`.
4. Continue checking the remaining domains.

To start over, delete `domain-results.csv` and run the script again.

## Example Console Output

```text
Total domains: 3509
Previously checked: 120
Pending: 3389

[1/3389] ✅ imobly.com.br - AVAILABLE
[2/3389] ❌ imobify.com.br - REGISTERED
[3/3389] ❌ imobix.com.br - REGISTERED

================================
SUMMARY
================================
Available: 1
Registered: 122
Total checked: 123
Results saved to: domain-results.csv
```

## Important Notes

The script uses an undocumented Registro.br availability endpoint. Its behavior, response format, and status codes may change without notice.

The script currently interprets status code `0` as available and `2` as registered. These mappings should be validated against current Registro.br responses before relying on the results.

Automated requests may be rate-limited or blocked. The configured delay reduces request frequency but does not guarantee access.

Always verify domain availability through the official [Registro.br](https://registro.br/) website before registering a domain.

## License

MIT
