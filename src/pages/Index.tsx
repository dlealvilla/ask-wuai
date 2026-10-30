import { SettingsProvider } from "@/contexts/SettingsContext";
import { MainView } from "@/components/MainView";
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <SettingsProvider>
      <Helmet>
        <title>Wuai - Ask Me Anything!</title>
        <meta name="description" content="A friendly voice assistant for curious kids to ask questions and learn about the world." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#e8f4f8" />
      </Helmet>
      <MainView />
    </SettingsProvider>
  );
};

export default Index;
