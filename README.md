# actualplaid

## Setup

- `yarn global add actualplaid-cli` or `npm install -g actualplaid-cli`
- Create [plaid developer account](https://dashboard.plaid.com/overview/development) and collect client id/secret keys
- Open Actual Budget desktop app
- Run `setup`: `ACTUAL_BUDGET_ID=My-Finances-12345 PLAID_CLIENT_ID=my-client-id PLAID_SECRET=my-secret-key actualplaid setup`
  - Alternatively, export these environment variables before running actualplaid
- Login to banks you would like to sync
- Switch back to CLI and map to accounts in Actual Budget
- Run `import`: `ACTUAL_BUDGET_ID=My-Finances-12345 PLAID_CLIENT_ID=my-client-id PLAID_SECRET=my-secret-key actualplaid import`

## Commands

```
	Usage
	  $ actualplaid <command> <flags>

	Commands & Options
    setup                     Link bank accounts with your Actual Budget accounts via Plai
    ls                        List currently syncing accounts
    import                    Sync bank accounts to Actual Budget
	    --account, -a             The account to import, ex: --account="My Checking"
	    --since, -s               The start date after which transactions should be imported. Defaults to beginning of current month, format: yyyy-MM-dd, ex: --since=2020-05-28
	    --includePending, -p    Include "pending" transactions in import, Defaults to false
    config                    Print the location of actualplaid the config file
    --version                 Print the version of actualplaid being used

	Examples
	  $ actualplaid import --account="My Checking" --since="2020-05-28"
```
