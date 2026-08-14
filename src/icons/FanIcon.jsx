import fan from "./fan.png";

export default function FanIcon({ className, ...props }) {
  return <img src={fan} className={className} alt="" {...props} />;
}
