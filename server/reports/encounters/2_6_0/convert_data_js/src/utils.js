module.exports = {
  applyDaysLate,
  getStatus,
};

function applyDaysLate(encounterNodes) {
  const withDaysLate = encounterNodes.map((encounter) => {
    const startDatetime = new Date(encounter.startDatetime);

    const dateDiff = Math.floor(
      (new Date() - startDatetime) / (1000 * 60 * 60 * 24)
    );

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
