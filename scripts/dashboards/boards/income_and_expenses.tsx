/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";

const averageIncomeScript = (ledger, panel, helpers, window) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const days = (new Date(ledger.dateLast) - new Date(ledger.dateFirst)) /
      (1000 * 60 * 60 * 24) +
    1;
  const months = days / (365 / 12);
  const value = currencyFormat.format(
    -panel.queries[0].result[0].value[ledger.ccy] / months,
  );
  return `<div style="font-size: 40px; font-weight: bold; color: #3daf46; text-align: center;">${value}</div>`;
};

const averageExpenseScript = (ledger, panel) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const days =
    (Number(new Date(ledger.dateLast)) - Number(new Date(ledger.dateFirst))) /
      (1000 * 60 * 60 * 24) +
    1;
  const months = days / (365 / 12);
  const value = currencyFormat.format(
    panel.queries[0].result[0].value[ledger.ccy] / months,
  );
  return `<div style="font-size: 40px; font-weight: bold; color: #af3d3d; text-align: center;">${value}</div>`;
};

const expenseLine = (ledger, panel, helpers, window) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const months = helpers
    .iterateMonths(ledger.dateFirst, ledger.dateLast)
    .map((m) => `${m.month}/${m.year}`);
  const amounts = {};

  // the beancount query only returns months where there was at least one matching transaction, therefore we group by month
  for (let row of panel.queries[0].result) {
    amounts[`${row.month}/${row.year}`] = row.value[ledger.ccy];
  }

  return {
    tooltip: {
      valueFormatter: currencyFormat.format,
    },
    xAxis: {
      data: months,
    },
    yAxis: {
      axisLabel: {
        formatter: currencyFormat.format,
      },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: months.map((month) => amounts[month] ?? 0),
      },
    ],
    onClick: (event) => {
      const [month, year] = event.name.split("/");
      const link = panel.queries[0].link
        .replaceAll("#", "%23")
        .replace("{time}", `${year}-${month.padStart(2, "0")}`);
      window.open(link);
    },
  };
};

const yearOverYearScript = (ledger, panel, helpers, window) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const years = helpers.iterateYears(ledger.dateFirst, ledger.dateLast);
  const maxAccounts = 7; // number of accounts to show, sorted by sum

  const accountSums = {};
  const amounts = {};
  for (let row of panel.queries[0].result) {
    if (!(row.account in accountSums)) accountSums[row.account] = 0;
    const value = row.account.startsWith("Income:")
      ? -row.value[ledger.ccy]
      : row.value[ledger.ccy];
    amounts[`${row.year}/${row.account}`] = value;
    accountSums[row.account] += value;
  }

  const accounts = Object.entries(accountSums)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name)
    .slice(0, maxAccounts)
    .reverse();
  return {
    legend: {
      top: "bottom",
    },
    tooltip: {
      formatter: "{a}",
    },
    xAxis: {
      axisLabel: {
        formatter: currencyFormat.format,
      },
    },
    yAxis: {
      data: accounts.map((account) => account.split(":").slice(1).join(":")),
    },
    grid: {
      containLabel: true,
      left: 0,
    },
    series: years.map((year) => ({
      type: "bar",
      name: year,
      data: accounts.map((account) => amounts[`${year}/${account}`] ?? 0),
      label: {
        show: true,
        position: "right",
        formatter: (params) => currencyFormat.format(params.value),
      },
    })),
    onClick: (event) => {
      const link = panel.queries[0].link
        .replaceAll("#", "%23")
        .replace("{account}", accounts[event.dataIndex])
        .replace("{time}", event.seriesName);
      window.open(link);
    },
  };
};

const convertToCNY = (amount: string, date?: string) =>
  b.convertCurrency(amount, ["USD", "HKD", "{{ledger.ccy}}"], date);

const incomePostTaxBql = `
SELECT 
    ${convertToCNY("SUM(position)")}
    AS value
WHERE account ~ '^Income:' AND NOT 'pretax' in tags
`;

const expensePostTaxBql = `
SELECT 
    ${convertToCNY("SUM(position)")}
    AS value
WHERE account ~ '^Expenses:' AND NOT 'pretax' in tags
`;
export const income_and_expenses = (
  <b.DashBoard name="Income and Expenses">
    <b.Panel
      title="Avg. Income per Month (post tax) 💰"
      type="html"
      width="33.33%"
      link={`/${mainTitle}/account/Income/?r=changes`}
      height="80px"
      queries={[
        {
          bql: incomePostTaxBql,
        },
      ]}
    >
      <b.Script fn={averageIncomeScript} />
    </b.Panel>

    <b.Panel
      title="Avg. Expenses per Month (post tax) 💸"
      type="html"
      width="33.33%"
      link={`/${mainTitle}/account/Expenses/?r=changes`}
      height="80px"
      queries={[
        {
          bql: expensePostTaxBql,
        },
      ]}
    >
      <b.Script fn={averageExpenseScript} />
    </b.Panel>

    <b.Panel
      title="Avg. Savings per Month (post tax) ✨"
      type="html"
      width="33.33%"
      link={`/${mainTitle}/account/Expenses/?r=changes`}
      height="80px"
      queries={[{ bql: incomePostTaxBql }, { bql: expensePostTaxBql }]}
    >
      <b.Script
        fn={(ledger, panel) => {
          const currencyFormat = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: ledger.ccy,
            maximumFractionDigits: 0,
          });
          const percentFormat = new Intl.NumberFormat(undefined, {
            style: "percent",
            maximumFractionDigits: 0,
          });
          const days = (Number(new Date(ledger.dateLast)) -
                Number(new Date(ledger.dateFirst))) /
              (1000 * 60 * 60 * 24) +
            1;
          const months = days / (365 / 12);
          const income = -panel.queries[0].result[0].value[ledger.ccy];
          const expenses = panel.queries[1].result[0].value[ledger.ccy];
          const rate = (income - expenses) / months;
          const ratePercent = 1 - expenses / income;
          const value = `${currencyFormat.format(rate)} (${
            percentFormat.format(
              ratePercent,
            )
          })`;
          return `<div style="font-size: 40px; font-weight: bold; color: #3daf46; text-align: center;">${value}</div>`;
        }}
      />
    </b.Panel>

    <b.Panel
      title="Income Categories (per month) post tax 💸"
      type="echarts"
      width="50%"
      link={`/${mainTitle}/account/Income/?r=changes`}
      queries={[
        {
          bql: `
        SELECT
          root(account, 4) AS account,
          ${convertToCNY("SUM(position)")}
        AS value
        WHERE account ~ '^Income:'
          AND NOT 'pretax' IN tags
        GROUP BY account
        `,
          link: `/${mainTitle}/account/{account}/?r=changes&time={time}`,
        },
      ]}
    >
      <b.Script
        fn={(ledger, panel, helpers, window) => {
          const currencyFormat = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: ledger.ccy,
            maximumFractionDigits: 0,
          });
          const days = (Number(new Date(ledger.dateLast)) -
                Number(new Date(ledger.dateFirst))) /
              (1000 * 60 * 60 * 24) +
            1;
          const divisor = days / (365 / 12);
          const accountTree = helpers.buildAccountTree(
            panel.queries[0].result,
            (row) => -row.value[ledger.ccy] / divisor,
            (parts, i) => parts[i],
          );
          // use click event on desktop, dblclick on mobile
          const clickEvt = window.screen.width < 800 ? "onDblClick" : "onClick";

          return {
            tooltip: {
              valueFormatter: currencyFormat.format,
            },
            series: [
              {
                type: "sunburst",
                radius: "100%",
                label: {
                  minAngle: 20,
                },
                nodeClick: false,
                data: accountTree.children[0].children,
              },
            ],
            [clickEvt]: (event) => {
              const account = "Income" +
                event.treePathInfo.map((i) => i.name).join(":");
              const time =
                new URLSearchParams(window.location.search).get("time") ?? "";
              const link = panel.queries[0].link
                .replaceAll("#", "%23")
                .replace("{account}", account)
                .replace("{time}", time);
              window.open(link);
            },
          };
        }}
      />
    </b.Panel>

    <b.Panel
      title="Expenses Categories (per month) 💸"
      type="echarts"
      width="50%"
      link={`/${mainTitle}/account/Expenses/?r=changes`}
      queries={[
        {
          bql: `
        SELECT
          root(account, 4) AS account,
          ${convertToCNY("SUM(position)")}
        AS value
        WHERE account ~ '^Expenses:'
          AND NOT 'pretax' IN tags
        GROUP BY account
        `,
          link: `/${mainTitle}/account/{account}/?r=changes&time={time}`,
        },
      ]}
    >
      <b.Script
        fn={(ledger, panel, helpers, window) => {
          const currencyFormat = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: ledger.ccy,
            maximumFractionDigits: 0,
          });
          const days = (Number(new Date(ledger.dateLast)) -
                Number(new Date(ledger.dateFirst))) /
              (1000 * 60 * 60 * 24) +
            1;
          const divisor = days / (365 / 12);

          const accountTree = helpers.buildAccountTree(
            panel.queries[0].result,
            (row) => row.value[ledger.ccy] / divisor,
            (parts, i) => parts[i],
          );
          accountTree.children[0].children.forEach((secondLevel) => {
            if (secondLevel.children.length > 0) {
              secondLevel.children.forEach((thirdLevel) => {
                // 关闭4层
                thirdLevel.children = [];
              });
            }
          });
          // use click event on desktop, dblclick on mobile
          const clickEvt = window.screen.width < 800 ? "onDblClick" : "onClick";

          return {
            tooltip: {
              valueFormatter: currencyFormat.format,
            },
            series: [
              {
                type: "sunburst",
                radius: "100%",
                label: {
                  minAngle: 20,
                },
                nodeClick: false,
                data: accountTree.children[0].children,
              },
            ],
            [clickEvt]: (event) => {
              const account = "Expenses" +
                event.treePathInfo.map((i) => i.name).join(":");
              const time =
                new URLSearchParams(window.location.search).get("time") ?? "";
              const link = panel.queries[0].link
                .replaceAll("#", "%23")
                .replace("{account}", account)
                .replace("{time}", time);
              window.open(link);
            },
          };
        }}
      />
    </b.Panel>
    <b.Panel
      title="Food Expenses 🥐"
      type="echarts"
      width="50%"
      link={`/${mainTitle}/account/Expenses:Food/`}
      queries={[
        {
          bql: `
      SELECT year, month, 
      ${convertToCNY("SUM(position)", "LAST(date)")}
      AS value
              WHERE account ~ '^Expenses:Food:'
              GROUP BY year, month
      `,
        },
      ]}
    >
      <b.Script fn={expenseLine} />
    </b.Panel>
    <b.Panel
      title="Health Expenses 🏥"
      type="echarts"
      width="50%"
      link={`/${mainTitle}/account/Expenses:Health/`}
      queries={[
        {
          bql: `
      SELECT year, month, 
      ${convertToCNY("SUM(position)", "LAST(date)")}
      AS value
              WHERE account ~ '^Expenses:Health:'
              GROUP BY year, month
      `,
        },
      ]}
    >
      <b.Script fn={expenseLine} />
    </b.Panel>

    <b.Panel
      title="Income Year-Over-Year 💰"
      type="echarts"
      width="50%"
      height="700px"
      queries={[
        {
          bql: `
      SELECT year, root(account, 3) AS account, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value
      WHERE account ~ "^Income:" AND NOT 'pretax' IN tags
      GROUP BY account, year
      ORDER BY account
      `,
        },
      ]}
    >
      <b.Script fn={yearOverYearScript} />
    </b.Panel>

    <b.Panel
      title="Expenses Year-Over-Year 💸"
      type="echarts"
      width="50%"
      height="700px"
      queries={[
        {
          bql: `
          SELECT year, root(account, 2) AS account, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value
          WHERE account ~ "^Expenses:" AND NOT 'pretax' IN tags
          GROUP BY account, year
          ORDER BY account
      `,
          link: `/${mainTitle}/account/{account}/?time={time}`,
        },
      ]}
    >
      <b.Script fn={yearOverYearScript} />
    </b.Panel>
    <b.Panel
      title="Top 10 biggest expenses"
      type="jinja2"
      width="20%"
      queries={[
        {
          bql: `
      SELECT
        date,
        payee,
        narration,
        ${convertToCNY("position")} as cost
      WHERE
        account ~ "^Expenses:"
        AND NOT 'pretax' IN tags
      ORDER BY cost DESC LIMIT 10
      `,
        },
      ]}
    >
      {}
      {`
      {% import "_query_table.html" as querytable %}
      {{ querytable.querytable(favaledger, None, panel.queries[0].result_types, panel.queries[0].result) }}
    `}
    </b.Panel>
    <b.Panel title="现金流量表" width="75%" queries={[]} type="echarts">
      <b.Script
        fn={(ledger) => {
          return {};
        }}
      />
    </b.Panel>
  </b.DashBoard>
);
