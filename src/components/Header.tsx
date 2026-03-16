type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        かしこい買い物リストが、あなたをお手伝いします
      </p>
    </header>
  );
}