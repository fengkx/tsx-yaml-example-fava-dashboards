/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";
import { convertCurrency } from "../utils.ts";

export const traveling = (
  <b.DashBoard name="Traveling">
    <b.Panel
      title="Travel Costs per Year 📅"
      type="echarts"
      link={`/${mainTitle}/income_statement/?filter=any(account:"^Expenses:Travel.*"),#travel`}
      queries={[
        {
          bql: `
        SELECT year, ${
            convertCurrency(
              "SUM(position)",
              ["USD", "HKD", "{{ledger.ccy}}"],
              "LAST(date)",
            )
          } AS value
              WHERE account ~ '^Expenses:' AND ('travel' IN tags OR account ~ '^Expenses:Travel')
              GROUP BY year
        `,
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
          const years = helpers.iterateYears(ledger.dateFirst, ledger.dateLast);
          const amounts = {};

          // the beancount query only returns months where there was at least one matching transaction, therefore we group by year
          for (let row of panel.queries[0].result) {
            amounts[row.year] = row.value[ledger.ccy];
          }

          return {
            tooltip: {
              valueFormatter: currencyFormat.format,
            },
            xAxis: {
              data: years,
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
                data: years.map((year) => amounts[year] ?? 0),
              },
            ],
            onClick: (event) => {
              const link = panel.queries[0].link
                .replaceAll("#", "%23")
                .replace("{time}", event.name);
              window.open(link);
            },
          };
        }}
      />
    </b.Panel>
    <b.Panel
      title="Destinations ✈️"
      type="echarts"
      link={`/${mainTitle}/income_statement/?filter=any(account:"^Expenses:Travel.*"),#travel`}
      queries={[
        {
          link:
            `/${mainTitle}/income_statement/?filter=any(account:"^Expenses:Travel.*"),#travel`,
          bql: `
        SELECT year, tags, ${
            convertCurrency("position", [
              "USD",
              "HKD",
              "{{ledger.ccy}}",
            ])
          } AS value
        WHERE account ~ '^Expenses:' AND ('travel' IN tags OR account ~ '^Expenses:Travel')
        ORDER BY date, tags DESC
        `,
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
          const travels = [];
          const amounts = {};

          for (const row of panel.queries[0].result) {
            console.log(row.tags);
            const tag = `${
              row.tags.find((tag) => tag.match(/^trip/)) ?? "unknown"
            }_${row.year}`;
            if (!(tag in amounts)) {
              travels.push(tag);
              amounts[tag] = 0;
            }
            amounts[tag] += row.value.number;
          }

          return {
            tooltip: {
              valueFormatter: currencyFormat.format,
            },
            grid: {
              containLabel: true,
              left: 0,
            },
            xAxis: {
              type: "value",
              axisLabel: {
                formatter: currencyFormat.format,
              },
            },
            yAxis: {
              type: "category",
              data: travels,
            },
            series: [
              {
                type: "bar",
                data: travels.map((travel) => amounts[travel]),
                label: {
                  show: true,
                  position: "right",
                  formatter: (params) => currencyFormat.format(params.value),
                },
              },
            ],
            onClick: (event) => {
              const link = panel.queries[0].link
                .replaceAll("#", "%23")
                .replace("{travel}", event.name);
              window.open(link);
            },
          };
        }}
      />
    </b.Panel>
  </b.DashBoard>
);
