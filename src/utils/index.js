const toVw = (num) => `${((window.Number(num).toFixed(5) / 750) * 100).toFixed(5)}vw`;

export default toVw;
