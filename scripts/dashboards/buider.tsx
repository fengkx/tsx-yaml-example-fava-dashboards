/// <reference lib="deno.ns" />
/** @jsx JSX.h */

import { stringify } from "https://deno.land/std@0.207.0/yaml/mod.ts";

import { JSX } from "./jsx/jsx-runtime.ts";

import * as b from "./utils.ts";
import { mainTitle } from "./common.ts";
import { overViewBoard } from "./boards/overview.tsx";
import { assetBoard } from "./boards/assets.tsx";
import { traveling } from "./boards/traveling.tsx";
import { sankey } from "./boards/sankey.tsx";
import { projection } from "./boards/projection.tsx";
import { income_and_expenses } from "./boards/income_and_expenses.tsx";

const config = (
  <b.DashBoards>
    {overViewBoard}
    {assetBoard}
    {income_and_expenses}
    {traveling}
    {sankey}
    {projection}
  </b.DashBoards>
);
console.info(config);
Deno.writeTextFile("./dashboards.yaml", stringify(config));
