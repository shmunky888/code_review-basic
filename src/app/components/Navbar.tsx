import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight" aria-label="Code Review — home">
          <Image src="/avatar.png" alt="" aria-hidden width={50} height={50} className="rounded-full" />
          <span>Code Review</span>
        </Link>
      </div>
    </nav>
  );
}
