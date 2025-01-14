import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a table representation of the current month.
 */
const MonthCalendarPlaceholder: Placeholder = {
  name: "monthCalendar",
  regex: /{{monthCalendar}}/,
  rules: [],
  apply: async () => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) =>
      new Date(year, i, 1).toLocaleString("default", { month: "long" }),
    );
    const days = Array.from({ length: 7 }, (_, i) =>
      new Date(year, 0, i).toLocaleString("default", { weekday: "narrow" }),
    );

    const boldNumbers = [
      "⓪",
      "①",
      "②",
      "③",
      "④",
      "⑤",
      "⑥",
      "⑦",
      "⑧",
      "⑨",
      "①⓪",
      "①①",
      "①②",
      "①③",
      "①④",
      "①⑤",
      "①⑥",
      "①⑦",
      "①⑧",
      "①⑨",
      "②⓪",
      "②①",
      "②②",
      "②③",
      "②④",
      "②⑤",
      "②⑥",
      "②⑦",
      "②⑧",
      "②⑨",
      "③⓪",
      "③①",
    ];

    const calendar = months.map((month, index) => {
      const daysInMonth = new Date(year, index + 1, 0).getDate();
      const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

      // Offset by the day of the week the month starts on
      const firstDay = new Date(year, index, 1).getDay();
      dayNumbers.unshift(...Array.from({ length: firstDay }, () => ""));

      // Highlight today's date
      const today = new Date();
      if (today.getMonth() === index) {
        dayNumbers[today.getDate() + firstDay - 1] = boldNumbers[today.getDate()];
      }

      return { month, dayNumbers };
    });

    const monthTableString = calendar.map(({ month, dayNumbers }) => {
      // Format as a table with each week on a new line
      const weeks = Math.ceil(dayNumbers.length / 7);
      const table = [];

      // Add the month name to the first row
      // Center the month name
      const centeredName = month.padStart(20 + month.length / 2, " ").padEnd(20, " ");
      table.push([centeredName]);

      // Add the day names to the first row
      table.push(days);

      for (let i = 0; i < weeks; i++) {
        const week = dayNumbers.slice(i * 7, (i + 1) * 7);
        table.push(week);
      }

      // Add leading spaces to single-digit days
      for (let i = 0; i < table.length; i++) {
        table[i] = table[i].map((day) => day.toString().padStart(2, " "));
      }

      // Join the rows into a string
      return table.map((row) => row.join("\t")).join("\n");
    });

    const currentCalendar = monthTableString[new Date().getMonth()];
    return { result: currentCalendar, monthCalendar: currentCalendar };
  },
  constant: true,
  result_keys: ["monthCalendar"],
  fn: async () => (await MonthCalendarPlaceholder.apply(`{{monthCalendar}}`)).result,
  example: "{{monthCalendar}}",
  description: "A table representation of the current month.",
  hintRepresentation: "{{monthCalendar}}",
  fullRepresentation: "Month Calendar",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Location],
};

export default MonthCalendarPlaceholder;
