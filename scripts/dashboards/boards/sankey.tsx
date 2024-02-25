/** @jsx JSX.h */
import * as b from "../utils.ts";
import { JSX } from "../jsx/jsx-runtime.ts";
import { mainTitle } from "../common.ts";

export const sankey = (
  <b.DashBoard name="Sankey PostTax">
    <b.Panel
      title="Sankey PostTax"
      type="d3_sankey"
      height="800px"
      link={`${mainTitle}/income_statement`}
      queries={[
        {
          bql: `
        SELECT account, CONVERT(SUM(position), '{{ledger.ccy}}') AS value
              WHERE account ~ '^(Income|Expenses):' AND NOT 'pretax' in tags
              GROUP BY account
        `,
          link: `/${mainTitle}/account/{account}/?time={time}`,
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
          const days =
            // @ts-expect-error
            (new Date(ledger.dateLast) - new Date(ledger.dateFirst)) /
              (1000 * 60 * 60 * 24) +
            1;
          const divisor = days / (365 / 12); // monthly
          const valueThreshold = 10; // skip nodes below this value

          const nodes: Array<{ name: string; label?: string }> = [
            { name: "Income" },
          ];
          const links = [];
          function addNode(root) {
            for (let node of root.children) {
              let label = node.name.split(":").pop();

              // skip over pass-through accounts
              while (node.children.length === 1) {
                node = node.children[0];
                label += ":" + node.name.split(":").pop();
              }

              // skip nodes below the threshold
              if (Math.abs(node.value / divisor) < valueThreshold) continue;

              nodes.push({ name: node.name, label });
              if (node.name.startsWith("Income:")) {
                links.push({
                  source: node.name,
                  target: root.name,
                  value: -node.value / divisor,
                });
              } else {
                links.push({
                  source: root.name == "Expenses" ? "Income" : root.name,
                  target: node.name,
                  value: node.value / divisor,
                });
              }
              addNode(node);
            }
          }

          const accountTree = helpers.buildAccountTree(
            panel.queries[0].result,
            (row) => row.value[ledger.ccy]
          );
          addNode(accountTree.children[0]);
          addNode(accountTree.children[1]);

          const savings =
            accountTree.children[0].name === "Income"
              ? -accountTree.children[0].value - accountTree.children[1].value
              : -accountTree.children[1].value - accountTree.children[0].value;
          if (savings > 0) {
            nodes.push({ name: "Savings" });
            links.push({
              source: "Income",
              target: "Savings",
              value: savings / divisor,
            });
          }

          return {
            align: "left",
            valueFormatter: currencyFormat.format,
            data: {
              nodes,
              links,
            },
            onClick: (event, node) => {
              if (node.name === "Savings") return;
              const time =
                new URLSearchParams(window.location.search).get("time") ?? "";
              const link = panel.queries[0].link
                .replaceAll("#", "%23")
                .replace("{account}", node.name)
                .replace("{time}", time);
              window.open(link);
            },
          };
        }}
      />
    </b.Panel>
  </b.DashBoard>
);
