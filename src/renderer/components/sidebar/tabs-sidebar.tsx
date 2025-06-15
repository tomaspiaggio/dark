import { DarkSidebar } from "./sidebar";

export function TabsSidebar() {
    return (
      <div className="flex bg-black h-full w-full">
        <div className="left w-[300px] h-full">
          <DarkSidebar />
        </div>
      </div>
    );
  }