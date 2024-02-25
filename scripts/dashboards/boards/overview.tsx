/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";

const assetScript: b.ScriptFunction = (ledger, panel) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const value = panel.queries[0].result[0]?.value[ledger.ccy];
  const valueFmt = currencyFormat.format(value ?? 0);
  return `<div style="font-size: 40px; font-weight: bold; color: #3daf46; text-align: center;">${valueFmt}</div>`;
};
const liabilitiesScript: b.ScriptFunction = (ledger, panel) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const value = panel.queries[0].result[0]?.value[ledger.ccy];
  const valueFmt = currencyFormat.format(value ? -value : 0);
  return `<div style="font-size: 40px; font-weight: bold; color: #af3d3d; text-align: center;">${valueFmt}</div>`;
};

export const overViewBoard = (
  <b.DashBoard name="Overview">
    <b.Panel
      title="Total Assets 💰"
      width="25%"
      height="80px"
      link={`/${mainTitle}/balance_sheet/`}
      type="html"
      queries={[
        {
          bql:
            "SELECT CONVERT(CONVERT(CONVERT(SUM(position), 'USD'), 'HKD'), 'CNY') AS value WHERE account ~ '^Assets:'",
        },
      ]}
    >
      <b.Script fn={assetScript} />
    </b.Panel>

    <b.Panel
      title="Assets Exclude Limited 💰"
      width="25%"
      height="80px"
      link={`/${mainTitle}/balance_sheet/`}
      type="html"
      queries={[
        {
          bql:
            "SELECT CONVERT(CONVERT(CONVERT(SUM(position), 'USD'), 'HKD'), 'CNY') AS value WHERE account ~ '^Assets:' AND NOT account  ~ '^Assets:Limit';",
        },
      ]}
    >
      <b.Script fn={assetScript} />
    </b.Panel>
    <b.Panel
      title="Liabilities 💳"
      type="html"
      width="50%"
      height="80px"
      link={`/${mainTitle}/balance_sheet/`}
      queries={[
        {
          bql:
            "SELECT CONVERT(SUM(position), '{{ledger.ccy}}') AS value WHERE account ~ '^Liabilities:'",
        },
      ]}
    >
      <b.Script fn={liabilitiesScript} />
    </b.Panel>
    <b.Panel
      type="echarts"
      title="Income/Expenses 💸 (posttax)"
      height="520px"
      link={`/${mainTitle}/income_statement/`}
      queries={[
        {
          name: "Income",
          stack: "income",
          bql:
            "SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value\nWHERE account ~ '^Income:' AND NOT 'pretax' IN tags\nGROUP BY year, month\n",
          link: `/${mainTitle}/account/Income/?time={time}`,
        },
        {
          name: "Housing",
          stack: "expenses",
          bql:
            "SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value\nWHERE account ~ '^Expenses:House:' AND NOT 'travel' IN tags\nGROUP BY year, month\n",
          link:
            `/${mainTitle}/account/Expenses:Housing/?filter=-#travel&time={time}`,
        },
        {
          name: "Food",
          stack: "expenses",
          bql:
            "SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value\nWHERE account ~ '^Expenses:Food:' AND NOT 'travel' IN tags\nGROUP BY year, month\n",
          link:
            `/${mainTitle}/account/Expenses:Food/?filter=-#travel&time={time}`,
        },
        {
          name: "Shopping",
          stack: "expenses",
          bql:
            "SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value\nWHERE account ~ '^Expenses:Shopping:' AND NOT 'travel' IN tags\nGROUP BY year, month\n",
          link:
            `/${mainTitle}/account/Expenses:Shopping/?filter=-#travel&time={time}`,
        },
        {
          name: "Travel",
          stack: "expenses",
          bql:
            "SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value\nWHERE (account ~ '^Expenses:' AND 'travel' IN tags) OR (account ~ '^Expenses:Travel')\nGROUP BY year, month\n",
          link: `/${mainTitle}/account/Expenses/?filter=#travel&time={time}`,
        },
        {
          name: "Other",
          stack: "expenses",
          bql: String.raw`
          SELECT year, month, CONVERT(SUM(position), '{{ledger.ccy}}', LAST(date)) AS value
WHERE account ~ '^Expenses:' AND NOT account ~ '^Expenses:(Housing|Food|Shopping):' AND NOT 'travel' IN tags AND NOT 'pretax' IN tags
GROUP BY year, month
          `,
          link:
            `/${mainTitle}/account/Expenses/?filter=all(-account:"^Expenses:(Housing|Food|Shopping)") -#travel -#pretax`,
        },
      ]}
    >
      <b.Script
        fn={(ledger, panel, helpers, window) => {
          const currencyFormat = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: ledger.ccy,
            maximumFractionDigits: 2,
          });
          const months = helpers
            .iterateMonths(ledger.dateFirst, ledger.dateLast)
            .map((m) => `${m.month}/${m.year}`);

          // the beancount query only returns months where there was at least one matching transaction, therefore we group by month
          const amounts = {};
          for (const query of panel.queries) {
            amounts[query.name] = {};
            for (const row of query.result) {
              amounts[query.name][`${row.month}/${row.year}`] =
                query.stack == "income"
                  ? -row.value[ledger.ccy]
                  : row.value[ledger.ccy];
            }
          }

          return {
            tooltip: {
              valueFormatter: currencyFormat.format,
            },
            legend: {
              top: "bottom",
            },
            xAxis: {
              data: months,
            },
            yAxis: {
              axisLabel: {
                formatter: currencyFormat.format,
              },
            },
            series: panel.queries.map((query) => ({
              type: "bar",
              name: query.name,
              stack: query.stack,
              data: months.map((month) => amounts[query.name][month] ?? 0),
            })),
            onClick: (event) => {
              const query = panel.queries.find(
                (q) => q.name === event.seriesName,
              );
              if (query) {
                const [month, year] = event.name.split("/");
                const link = query.link
                  .replaceAll("#", "%23")
                  .replace("{time}", `${year}-${month.padStart(2, "0")}`);
                window.open(link);
              }
            },
          };
        }}
      />
    </b.Panel>
  </b.DashBoard>
);
