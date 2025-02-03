function applyDaysLate(encounterNodes) {
  const withDaysLate = encounterNodes.map((encounter) => {
    const startDatetime = new Date(encounter.startDatetime);

    const daysLate = Math.floor(
      (new Date() - startDatetime) / (1000 * 60 * 60 * 24)
    );
    return {
      ...encounter,
      daysLate: daysLate > 0 ? daysLate : 0,
    };
  });

  return withDaysLate;
}

module.exports = {
  applyDaysLate,
};
