function isOlderThan(date, days) {
  const expirationDate = new Date() - days * 24 * 60 * 60 * 1000;
  return new Date(date) < expirationDate;
}

function getDaysSince(dayCreated) {
  const oneDay = 24 * 60 * 60 * 1000;
  const now = new Date();
  return Math.round(Math.abs((now - new Date(dayCreated)) / oneDay));
}

module.exports = { isOlderThan, getDaysSince }