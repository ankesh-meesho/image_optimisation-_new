import Head from "next/head";
import ImageCompressor from "../components/ImageCompressor.jsx";
export default function Home() {
  return (
    <>
      <Head>
        <title>My App</title>
        <meta name="description" content="My Next.js app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ImageCompressor />
    </>
  );
} 