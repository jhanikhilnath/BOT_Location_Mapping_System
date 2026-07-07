export default function catchasync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
