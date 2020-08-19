# actualplaid

## Setup

NOTE: The default PLAID_ENV is `development` if you're using a sandbox for testing purposes, please set an the env variable `PLAID_ENV` to `sandbox`. Read more on the [Plaid doc site](https://dashboard.plaid.com/overview/sandbox)

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
    setup            Link bank accounts with your Actual Budget accounts via Plai
    ls               List currently syncing accounts
    import           Sync bank accounts to Actual Budget
      --account, -a   The account to import, ex: --account="My Checking"
      --since, -s     The start date after which transactions should be imported. Defaults to beginning of current month, format: yyyy-MM-dd, ex: --since=2020-05-28
    config           Print the location of actualplaid the config file
    --version        Print the version of actualplaid being used

  Examples
    $ actualplaid import --account="My Checking" --since="2020-05-28"
```

## Environment Variables

| Variable            | Required | Default      | Example                           | Needed by                                                                    |
| ------------------- | -------- | ------------ | --------------------------------- | ---------------------------------------------------------------------------- |
| ACTUAL_BUDGET_ID    | true     | ---          | My-Finances-12345                 | [Actual Budget API](https://actualbudget.com/docs/developers/using-the-API/) |
| APP_PORT            | false    | 3000         | 3000                              | Plaid Linking                                                                |
| PLAID_CLIENT_ID     | true     | ---          | 5817346120sd7bfd1691vfh7          | [Plaid](https://plaid.com/docs/#create-link-token)                           |
| PLAID_SECRET        | true     | ---          | 8f5cd6729h0v5d247vc190ddcs4l2a    | [Plaid](https://plaid.com/docs/#create-link-token)                           |
| PLAID_ENV           | false    | development  | sandbox                           | [Plaid](https://plaid.com/docs/#create-link-token)                           |
| PLAID_PRODUCTS      | false    | transactions | transactions,auth,identity,income | [Plaid](https://plaid.com/docs/#create-link-token)                           |
| PLAID_COUNTRY_CODES | false    | US           | US,CA,IR                          | [Plaid](https://plaid.com/docs/#create-link-token)                           |  |
