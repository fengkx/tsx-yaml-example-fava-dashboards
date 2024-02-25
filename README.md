An example showing how to customize JSX to build a complex yaml file with type checking and code completion. I am using [deno](https://deno.land), But it can be done on other JavaScript runtime.

This is a example building `dashboards.yaml` for [fava-dashboards](https://github.com/andreasgerstmayr/fava-dashboards)

## Usage

Run

```bash
deno run --allow-write='.' scripts/dashboards/buider.tsx
```
which genernate the dashboard.yaml file.

Inspired By [This Article](https://kirbysayshi.com/2020/03/21/considering-then-abandoning-jsx-for-structured-yaml-config.html)