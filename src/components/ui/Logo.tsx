import Image from "next/image";

type LogoProps = {
  width?: number;
  height?: number;
};

export default function Logo({
  width = 220,
  height = 60,
}: LogoProps) {
  return (
    <Image
      src="/logos/lab.png"
      alt="Datara Lab"
      width={width}
      height={height}
      priority
    />
  );
}