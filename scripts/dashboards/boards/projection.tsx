/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";

const projectionScript: b.ScriptFunction = (ledger, panel, helpers, window) => {
  console.log(panel);
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });
  const projectYears = 2; // number of years to project

  // the beancount query only returns months where there was at least one matching transaction, therefore we group by month
  const amounts = {};
  const amountsEx = {};
  for (const row of panel.queries[0].result) {
    amounts[`${row.month}/${row.year}`] = row.value[ledger.ccy];
  }
  for (const row of panel.queries[1].result) {
    amountsEx[`${row.month}/${row.year}`] = row.value[ledger.ccy];
  }

  const results = panel.queries[0].result;
  const resultsEx = panel.queries[1].result;
  const finalAmount = results[results.length - 1].value[ledger.ccy];
  const dateFirst = new Date(resultsEx[0].year, resultsEx[0].month - 1, 1);
  const dateLast = new Date(
    new Date(
      resultsEx[resultsEx.length - 1].year,
      resultsEx[resultsEx.length - 1].month,
      1
    ).getTime() - 1
  );
  const days =
    (Number(dateLast) - Number(dateFirst)) / (1000 * 60 * 60 * 24) + 1;
  const totalDiff =
    resultsEx[resultsEx.length - 1].value[ledger.ccy] -
    resultsEx[0].value[ledger.ccy];
  const monthlyDiff = (totalDiff / days) * (365 / 12);

  const dateLastYear = dateLast.getFullYear();
  const dateLastMonth = dateLast.getMonth() + 1;
  const dateFirstStr = `${dateFirst.getFullYear()}-${
    dateFirst.getMonth() + 1
  }-1`;
  const dateProjectUntilStr = `${
    dateLastYear + projectYears
  }-${dateLastMonth}-1`;
  const months = helpers
    .iterateMonths(dateFirstStr, dateProjectUntilStr)
    .map((m) => `${m.month}/${m.year}`);
  const lastMonthIdx = months.findIndex(
    (m) => m === `${dateLastMonth}/${dateLastYear}`
  );

  const projection = [];
  let sum = finalAmount;
  for (let i = lastMonthIdx; i < months.length; i++) {
    projection[months[i]] = sum;
    sum += monthlyDiff;
  }

  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (val) => (val ? currencyFormat.format(val) : ""),
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
    series: [
      {
        type: "line",
        name: "Net Worth",
        smooth: true,
        connectNulls: true,
        showSymbol: false,
        data: months.map((month) => amounts[month]),
      },
      {
        type: "line",
        name: "Excluding onetime txns",
        smooth: true,
        connectNulls: true,
        showSymbol: false,
        data: months.map((month) => amountsEx[month]),
      },
      {
        type: "line",
        name: "Projection",
        lineStyle: {
          type: "dashed",
        },
        showSymbol: false,
        data: months.map((month) => projection[month]),
      },
    ],
    onClick: (event) => {
      if (event.seriesName === "Projection") return;
      const [month, year] = event.name.split("/");
      const link = panel.queries[0].link
        .replaceAll("#", "%23")
        .replace("{time}", `${year}-${month.padStart(2, "0")}`);
      window.open(link);
    },
  };
};

export const projection = (
  <b.DashBoard name="Projection">
    <b.Panel
      title="Net Worth"
      link={`/${mainTitle}/income_statement/`}
      type="echarts"
      queries={[
        {
          bql: `
            SELECT year, month,
              ${b.convertCurrency(
                "LAST(balance)",
                ["USD", "HKD", "{{ledger.ccy}}"],
                "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)"
              )} AS value
              WHERE account_sortkey(account) ~ '^[01]'
              GROUP BY year, month
              ORDER BY year, month`,
          link: `/${mainTitle}/balance_sheet/?time={time}`,
        },
        {
          bql: `
            SELECT year, month,
            ${b.convertCurrency(
              "LAST(balance)",
              ["USD", "HKD", "{{ledger.ccy}}"],
              "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)"
            )}
               AS value
              WHERE
                account_sortkey(account) ~ '^[01]' 
                AND NOT 'wedding' IN tags 
                AND NOT 'weddinggift' IN tags 
                AND NOT account ~ '.*Onetime.*'
              GROUP BY year, month
              ORDER BY year, month`,
        },
      ]}
    >
      <b.Script fn={projectionScript} />
    </b.Panel>
  </b.DashBoard>
);
