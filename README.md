# Domain Availability Checker

A simple Node.js tool to check `.com.br` domain availability using Registro.br, with a lightweight HTML viewer to explore the results.

No frameworks or external dependencies required.

## Features

- Check `.com.br` domain availability using Registro.br
- Import domains from a CSV file
- Export results to a single CSV file
- Sort available domains to the top
- Save progress automatically after each check
- Resume interrupted checks
- Retry failed requests
- Stop when rate-limited
- View results through a simple HTML interface
- Search and filter domains by availability status
- Reload results without restarting the viewer
- Upload a CSV file manually

## Requirements

- Node.js 18 or higher
- A modern web browser

## Project Structure

```text
domain-checker/
├── check-domains.mjs
├── domains.csv
├── domain-results.csv
├── index.html
└── README.md
```

`domain-results.csv` is generated automatically after running the script.

## Getting Started

### 1. Prepare your domains

Create a `domains.csv` file containing the domains you want to check.

```csv
domain
example.com.br
mywebsite.com.br
newproject.com.br
sampledomain.com.br
testbrand.com.br
```

All domains must use the `.com.br` extension.

### 2. Run the domain checker

```bash
node check-domains.mjs
```

The script reads `domains.csv`, checks each domain, and saves the results automatically.

### 3. View the results

The script generates `domain-results.csv` with the following structure:

```csv
domain,status,code
newproject.com.br,AVAILABLE,0
testbrand.com.br,AVAILABLE,0
example.com.br,REGISTERED,2
mywebsite.com.br,REGISTERED,2
sampledomain.com.br,UNKNOWN,5
```

_Example statuses are illustrative and do not represent actual domain availability._

Results are sorted by status, with available domains first and domains alphabetically ordered within each group.

## HTML Viewer

The project includes a lightweight HTML interface for browsing domain results.

### Start the local server

From the project directory, run:

```bash
npx serve .
```

Open the local URL displayed in your terminal, typically `http://localhost:3000`.

The viewer automatically loads `domain-results.csv`.

### Viewer Features

- **Dashboard:** Displays total, available, registered, and other domain counts.
- **Search:** Filter domains by name.
- **Status filters:** Show all domains or filter by availability status.
- **Reload:** Refresh results after running the checker.
- **CSV upload:** Manually select a results file.
- **Responsive layout:** Works on desktop and mobile browsers.

Alternatively, open `index.html` directly in your browser and use the CSV upload option. Automatic CSV loading requires a local HTTP server.

## Domain Statuses

| Status       | Description                            |
| ------------ | -------------------------------------- |
| `AVAILABLE`  | Domain reported as available           |
| `REGISTERED` | Domain reported as registered          |
| `UNKNOWN`    | Unrecognized response from Registro.br |
| `ERROR`      | Request failed or was rate-limited     |

## Configuration

You can customize the following constants in `check-domains.mjs`:

```javascript
const INPUT_FILE = "domains.csv";
const OUTPUT_FILE = "domain-results.csv";

const DELAY_MS = 4000;
const MAX_RETRIES = 2;
```

| Option        | Description                                        |
| ------------- | -------------------------------------------------- |
| `INPUT_FILE`  | CSV file containing domains to check               |
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

1. Load previously saved results from `domain-results.csv`.
2. Skip domains marked as `AVAILABLE` or `REGISTERED`.
3. Retry domains marked as `UNKNOWN` or `ERROR`.
4. Continue checking remaining domains.

To start over, delete `domain-results.csv` and run the script again.

## Example Console Output

```text
Total domains: 500
Previously checked: 120
Pending: 380

[1/380] ✅ newproject.com.br - AVAILABLE
[2/380] ❌ example.com.br - REGISTERED
[3/380] ❌ mywebsite.com.br - REGISTERED

================================
SUMMARY
================================
Available: 1
Registered: 122
Total checked: 123
Results saved to: domain-results.csv
```

_Illustrative output._

## Important Notes

The script uses an undocumented Registro.br availability endpoint. Its behavior, response format, and status codes may change without notice.

The script currently interprets status code `0` as available and `2` as registered. These mappings should be validated against current Registro.br responses before relying on the results.

Automated requests may be rate-limited or blocked. The configured delay reduces request frequency but does not guarantee access.

Always confirm availability through the official [Registro.br](https://registro.br/) website before registering a domain.

## License

MIT
