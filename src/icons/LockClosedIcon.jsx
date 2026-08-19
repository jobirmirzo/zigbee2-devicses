import lockClosed from "./lock_closed.png";

export default function LockClosedIcon({ className, ...props }) {
  return <img src={lockClosed} className={className} alt="" {...props} />;
}
