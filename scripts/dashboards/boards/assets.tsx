/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";
import { convertCurrency } from "../utils.ts";

const assetScript: b.ScriptFunction = (ledger, panel) => {
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 0,
  });

  const data = panel.queries[0].result
    .filter((row) => row.market_value[ledger.ccy])
    .map((row) => ({
      name: Object.keys(row.units)[0],
      value: row.market_value[ledger.ccy],
    }));

  return {
    tooltip: {
      formatter: (params) =>
        `${params.marker} ${
          ledger.commodities[params.name]?.meta.name ?? params.name
        } <span style="padding-left: 15px; font-weight: bold;">${
          currencyFormat.format(
            params.value,
          )
        }</span> (${params.percent.toFixed(0)}%)`,
    },
    series: [
      {
        type: "pie",
        data,
      },
    ],
  };
};

const netWorth: b.ScriptFunction = (ledger, panel, helpers, window) => {
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
  for (const row of panel.queries[0].result) {
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
        connectNulls: true,
        data: months.map((month) => amounts[month]),
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

const portfolio: b.ScriptFunction = (ledger, panel, helpers, window) => {
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
    amounts[`${row.month}/${row.year}`] = {
      market_value: row.market_value[ledger.ccy],
      book_value: row.book_value[ledger.ccy],
    };
  }

  return {
    tooltip: {
      trigger: "axis",
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
    series: [
      {
        type: "line",
        name: "Market Value",
        smooth: true,
        connectNulls: true,
        data: months.map((month) => amounts[month]?.market_value),
      },
      {
        type: "line",
        name: "Book Value",
        smooth: true,
        connectNulls: true,
        data: months.map((month) => amounts[month]?.book_value),
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

const portfolioGain: b.ScriptFunction = (ledger, panel, helpers, window) => {
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
    amounts[`${row.month}/${row.year}`] = row.market_value[ledger.ccy] -
      row.book_value[ledger.ccy];
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
        connectNulls: true,
        data: months.map((month) => amounts[month]),
      },
    ],
  };
};

const calasses: b.ScriptFunction = (ledger, panel, helpers, window) => {
  console.log(panel.queries);
  const currencyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: ledger.ccy,
    maximumFractionDigits: 2,
  });

  let totalValue = 0;
  const assetClasses = {};
  for (const row of panel.queries[0].result) {
    if (!row.market_value[ledger.ccy]) continue;

    const ccy = Object.keys(row.units)[0];
    if (ccy === "CNY") {
      // CNY 还需要另外分
      continue;
    }

    const value = row.market_value[ledger.ccy];
    const assetName = ledger.commodities[ccy]?.meta.name ?? ccy;
    const assetClass = ledger.commodities[ccy]?.meta.asset_class ?? "undefined";
    if (!(assetClass in assetClasses)) {
      assetClasses[assetClass] = { name: assetClass, children: [] };
    }
    assetClasses[assetClass].children.push({ name: assetName, value });
    totalValue += value;
  }

  for (let i = 1; i < panel.queries.length; i++) {
    const query = panel.queries[i];
    const assetClass = query.name;
    for (const row of query.result) {
      if (!row.market_value[ledger.ccy]) continue;
      const ccy = Object.keys(row.units)[0];

      const value = row.market_value[ledger.ccy];

      const assetName = ledger.commodities[ccy]?.meta.name ?? ccy;
      if (!(assetClass in assetClasses)) {
        assetClasses[assetClass] = { name: assetClass, children: [] };
      }
      assetClasses[assetClass].children.push({ name: assetName, value });
      totalValue += value;
    }
  }

  const r = {
    totalValue,
    tooltip: {
      formatter: (params) =>
        `${params.marker} ${params.name} <span style="padding-left: 15px; font-weight: bold;">${
          currencyFormat.format(
            params.value,
          )
        }</span> (${((params.value / totalValue) * 100).toFixed(0)}%)`,
    },
    legend: {
      orient: "vertical",
      left: "left",
    },
    series: [
      {
        type: "sunburst",
        label: {
          show: true,
        },
        levels: [
          {},
          { label: { show: true }, minAngle: 20 },
          { label: { show: true, minAngle: 15 } },
        ],
        data: Object.values(assetClasses),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
  console.log(r);
  return r;
};

export const assetBoard = (
  <b.DashBoard name="Assets">
    <b.Panel
      title="Assets 🏦"
      width="50%"
      link={`/${mainTitle}/balance_sheet/`}
      type="echarts"
      queries={[
        {
          bql: String
            .raw`SELECT UNITS(SUM(position)) as units, CONVERT(SUM(position), '{{ledger.ccy}}') as market_value
          WHERE account_sortkey(account) ~ '^[01]'
          GROUP BY currency, cost_currency
          ORDER BY market_value`,
          link: `/${mainTitle}/account/{account}/?time={time}`,
        },
      ]}
    >
      <b.Script fn={assetScript} />
    </b.Panel>

    <b.Panel
      title="Net Worth 💰"
      width="50%"
      link={`${mainTitle}/income_statement/`}
      queries={[
        {
          /**
           *
          Workaround for getting the last day of a given month:
          YMONTH(date) returns a date instance of 1st of the given month and year
          adding 31 days gives us the next month (unless it's e.g. Jan 31... this case should be avoided by using FIRST(date))
          YMONTH() gives 1st of the (next) month
          minus 1 day gives us the last day of the month
           */
          bql: String.raw`SELECT year, month,
      CONVERT(LAST(balance), '{{ledger.ccy}}', DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)) AS value
      WHERE account_sortkey(account) ~ '^[01]'
      GROUP BY year, month`,
        },
      ]}
      type="echarts"
    >
      <b.Script fn={netWorth} />
    </b.Panel>

    <b.Panel
      type="echarts"
      width="50%"
      title="Portfolio 📈"
      link={`/${mainTitle}/balance_sheet/?time={time}`}
      queries={[
        {
          bql: String.raw`
        SELECT year, month,
              
        ${
            convertCurrency(
              "LAST(balance)",
              ["USD", "HKD", "CNY"],
              "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)",
            )
          } AS market_value,
        ${
            convertCurrency(
              "COST(LAST(balance))",
              ["USD", "HKD", "CNY"],
              "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)",
            )
          } AS book_value
              WHERE account ~ '^Assets:Stock' OR account ~ '^Assets:Funds' OR account ~ '^Assets:Cryptos'
              GROUP BY year, month
              `,
        },
      ]}
    >
      <b.Script fn={portfolio} />
    </b.Panel>

    <b.Panel
      type="echarts"
      width="50%"
      title="Portfolio Gains ✨"
      link={`/${mainTitle}/balance_sheet/?time={time}`}
      queries={[
        {
          bql: String.raw`
        SELECT year, month,
              
        ${
            convertCurrency(
              "LAST(balance)",
              ["USD", "HKD", "CNY"],
              "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)",
            )
          } AS market_value,
        ${
            convertCurrency(
              "COST(LAST(balance))",
              ["USD", "HKD", "CNY"],
              "DATE_ADD(YMONTH(DATE_ADD(YMONTH(FIRST(date)), 31)), -1)",
            )
          } AS book_value
              WHERE account ~ '^Assets:Stock' OR account ~ '^Assets:Funds' OR account ~ '^Assets:Cryptos'
              GROUP BY year, month
              `,
        },
      ]}
    >
      <b.Script fn={portfolioGain} />
    </b.Panel>

    <b.Panel
      type="echarts"
      title="Asset Classes 🏦"
      height="600px"
      width="1000px"
      link={`/${mainTitle}/balance_sheet/?time={time}`}
      queries={[
        {
          bql: String.raw`
        SELECT UNITS(SUM(position)) as units,
              
        ${
            convertCurrency("SUM(position)", [
              "USD",
              "HKD",
              "CNY",
            ])
          } AS market_value
        WHERE account_sortkey(account) ~ '^[01]' 
        AND NOT currency='CNY'
        GROUP BY currency
        ORDER BY market_value
              `,
        },
        {
          name: "Gold",
          bql: createClassifyBql("Assets:Gold", "CNY"),
        },
        {
          name: "Funds",
          bql: createClassifyBql("Assets:Funds", "CNY"),
        },
        {
          name: "Cash",
          bql: createClassifyBql(
            ["Assets:Bank", "Assets:AliPay", "Assets:WechatPay"],
            "CNY",
          ),
        },
        {
          name: "FinanceProduct",
          bql: createClassifyBql("Assets:FinanceProduct", "CNY"),
        },
        {
          name: "Limited",
          bql: createClassifyBql("Assets:Limited", "CNY"),
        },
      ]}
    >
      <b.Script fn={calasses} />
    </b.Panel>
  </b.DashBoard>
);

function createClassifyBql(
  accountPrefix: string | string[],
  currency: string,
): string {
  accountPrefix = Array.isArray(accountPrefix)
    ? accountPrefix
    : [accountPrefix];

  const regex = accountPrefix.map((prefix) => `(^${prefix})`).join("|");
  return String.raw`
  SELECT UNITS(SUM(position)) as units,
      ${convertCurrency("SUM(position)", ["USD", "HKD", "CNY"])} AS market_value
      WHERE currency='${currency}' AND account ~ '${regex}'
      GROUP BY currency, cost_currency
      ORDER BY market_value
  `;
}
