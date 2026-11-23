module.exports = {
  applyDaysLate,
  getStatus,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// The local calendar date of `date`, as a number of milliseconds that subtracts in whole days
function localDay(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function applyDaysLate(encounterNodes) {
  const withDaysLate = encounterNodes.map((encounter) => {
    const startDatetime = new Date(encounter.startDatetime);

    // Calendar days, from the encounter's date to today, in local time - on the server, the
    // report's timezone. Counting 24-hour periods made yesterday afternoon 0 days late this
    // morning.
    const dateDiff = (localDay(new Date()) - localDay(startDatetime)) / MS_PER_DAY;

    const daysLate = dateDiff > 0 ? dateDiff : 0;

    const status = getStatus(daysLate);

    return {
      ...encounter,
      daysLate,
      status,
    };
  });

  return withDaysLate;
}

function getStatus(daysLate) {
  if (daysLate > 7) {
    return "LTFU";
  }

  if (daysLate > 0) {
    return "LATE";
  }

  return "";
}
