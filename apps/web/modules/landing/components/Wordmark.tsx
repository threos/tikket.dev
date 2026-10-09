import classNames from "classnames";

type WordmarkProps = {
  className?: string;
};

// The SVG is 84.47 x 26; width and height are set so the header does not shift while it loads.
export function Wordmark({ className }: WordmarkProps) {
  return (
    <>
      <img
        src="/tikket/wordmark.svg"
        alt="Tikket"
        width={85}
        height={26}
        className={classNames("block w-auto dark:hidden", className)}
      />
      <img
        src="/tikket/wordmark-white.svg"
        alt="Tikket"
        width={85}
        height={26}
        className={classNames("hidden w-auto dark:block", className)}
      />
    </>
  );
}
