import { useEffect } from "react";

export default function BuzzsproutPlayer() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://www.buzzsprout.com/2456315.js?artist=&container_id=buzzsprout-large-player-limit-5&limit=5&player=large";
    script.async = true;
    script.charset = "utf-8";

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      id="buzzsprout-large-player-limit-5"
      className="mt-4"
    />
  );
}
