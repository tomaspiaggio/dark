"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  User,
  X
} from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  popState,
  pushState,
  refreshState,
} from "@/controller/popstate-history";
import {
  closeTab,
  getAllTabs,
  navigateActiveTab,
  renameTab,
  reorderTab,
  subscribeToTabChanges,
  switchToTab,
} from "@/controller/tabs";
import { toggleTabsSpotlight } from "@/controller/url-spotlight";
import { Tab } from "@/types/tab";

// --- MOCK DATA ---
const pinnedItems: Tab[] = [
  {
    id: "1",
    icon: "https://www.google.com/s2/favicons?domain=x.com&sz=16",
    title: "Follow me on Twitter",
    url: "https://x.com/TomasPiaggio",
    active: false,
  },
  {
    id: "2",
    icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=16",
    title: "Watch my videos on YouTube",
    url: "https://youtube.com",
    active: false,
  },
  {
    id: "3",
    icon: "https://www.google.com/s2/favicons?domain=gmail.com&sz=16",
    title: "Check out my emails on Gmail",
    url: "https://gmail.com",
    active: false,
  },
];

const initialBookmarks: Tab[] = [
  {
    id: "1",
    icon: "https://www.google.com/s2/favicons?domain=x.com&sz=16",
    title: "Twitter",
    url: "https://x.com/TomasPiaggio",
    active: false,
  },
  {
    id: "2",
    icon: "https://www.google.com/s2/favicons?domain=github.com&sz=16",
    title: "Github Autonoma",
    url: "https://github.com/autonoma-app",
    active: false,
  },
  {
    id: "3",
    icon: "https://www.google.com/s2/favicons?domain=github.com&sz=16",
    title: "Github Cronjobs",
    url: "https://github.com/autonoma-app/cronjobs",
    active: false,
  },
];

// Custom sensor that allows clicking on tabs
class CustomPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
        // Allow dragging but also allow clicks
        return true;
      },
    },
  ];

  onPointerMove(event: PointerEvent) {
    // Only start dragging if moved more than 5px
    const { clientX, clientY } = event;
    const { x: startX, y: startY } = this.initialCoordinates;

    const deltaX = Math.abs(clientX - startX);
    const deltaY = Math.abs(clientY - startY);

    if (deltaX > 5 || deltaY > 5) {
      super.onPointerMove(event);
    }
  }
}

// Store tab click handlers globally so the sensor can access them
const tabClickHandlers = new Map<string, () => void>();

// --- DRAGGABLE BOOKMARK ITEM ---
function SortableBookmarkItem({ item }: { item: Tab }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center py-1.5 px-2 text-sm rounded-md hover:bg-white/10 cursor-pointer"
    >
      <img src={item.icon} className="h-4 w-4 mr-3 flex-shrink-0" />
      <span className="flex-grow truncate">{item.title}</span>
      <GripVertical
        {...attributes}
        {...listeners}
        className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

// --- DRAGGABLE TAB ITEM (WITH EDITING AND CLOSE BUTTON) ---
function SortableTabItem({
  item,
  onRename,
  onClose,
  onClick,
}: {
  item: Tab;
  onRename: (id: string, newName: string) => void;
  onClose: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(item.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Register click handler
  React.useEffect(() => {
    tabClickHandlers.set(item.id, () => onClick(item.id));
    return () => tabClickHandlers.delete(item.id);
  }, [item.id, onClick]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onRename(item.id, name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setName(item.title);
      setIsEditing(false);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(item.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if not dragging and not editing
    if (!isDragging && !isEditing) {
      onClick(item.id);
    }
  };

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={`group flex items-center py-1.5 px-2 text-sm rounded-md hover:bg-white/10 cursor-pointer ${
        item.active ? "bg-white/10" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <Avatar className="h-4 w-4 mr-3">
        <AvatarImage src={item.icon || "/placeholder.svg"} />
        <AvatarFallback>{item.title.charAt(0)}</AvatarFallback>
      </Avatar>
      {isEditing
        ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-6 p-0 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-grow"
          />
        )
        : <span className="flex-grow truncate">{item.title}</span>}
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 ml-1"
        onClick={handleCloseClick}
      >
        <X className="h-3 w-3 text-red-400 hover:text-red-300" />
      </Button>
    </div>
  );
}

// --- MAIN SIDEBAR COMPONENT ---
export function DarkSidebar() {
  const [bookmarks, setBookmarks] = React.useState(initialBookmarks);
  const [tabs, setTabs] = React.useState<Tab[]>([]);
  const [urlInput, setUrlInput] = React.useState("https://getautonoma.com");

  // Subscribe to tab changes from backend
  React.useEffect(() => {
    subscribeToTabChanges((updatedTabs) => {
      const activeTab = updatedTabs.find((tab) => tab.active);
      if (activeTab) {
        setUrlInput(activeTab.url);
      }
      setTabs(updatedTabs.map((tab) => ({
        ...tab,
        icon: `https://www.google.com/s2/favicons?domain=${
          tab.url.replace(/^https?:\/\//, "").split("/")[0]
        }&sz=16`,
      })));
    });

    // Get initial tabs
    getAllTabs().then((initialTabs) => {
      setTabs(initialTabs.map((tab) => ({
        ...tab,
        icon: `https://www.google.com/s2/favicons?domain=${
          tab.url.replace(/^https?:\/\//, "").split("/")[0]
        }&sz=16`,
      })));
    }).catch(console.error);
  }, []);

  // Use custom sensor that allows both clicking and dragging
  const sensors = useSensors(
    useSensor(CustomPointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      if (active.data.current?.sortable.containerId === "bookmarks") {
        setBookmarks((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
      if (active.data.current?.sortable.containerId === "tabs") {
        // Handle tab reordering through backend
        const oldIndex = tabs.findIndex((item) => item.id === active.id);
        const newIndex = tabs.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderTab(active.id as string, newIndex);
        }
      }
    }
  };

  const handleTabRename = (id: string, newName: string) => {
    renameTab(id, newName);
  };

  const handleTabClose = (tabId: string) => {
    closeTab(tabId);
  };

  const handleTabClick = (tabId: string) => {
    switchToTab(tabId);
  };

  const handleUrlInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      console.log("urlInput", urlInput);
      // Add protocol if missing
      const url = urlInput.startsWith("http")
        ? urlInput
        : `https://${urlInput}`;
      navigateActiveTab(url);
      // Unfocus input on enter
      e.currentTarget.blur();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="dark flex h-screen w-full flex-col bg-arc-brown-dark text-gray-200 p-2 space-y-4 font-sans">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-end space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => popState()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => pushState()}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refreshState()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlInputKeyDown}
            className="bg-white/5 border-white/10 h-8 text-sm"
          />
        </div>

        {/* Pinned Items */}
        <div className="grid grid-cols-3 gap-2">
          {pinnedItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="h-14 bg-white/5 hover:bg-white/10 flex items-center justify-center"
            >
              <img src={item.icon} className="h-6 w-6" />
            </Button>
          ))}
        </div>

        {/* Bookmarks */}
        <div className="flex-grow overflow-y-auto space-y-1 pr-1">
          <SortableContext
            items={bookmarks}
            strategy={verticalListSortingStrategy}
            id="bookmarks"
          >
            {bookmarks.map((item) => (
              <SortableBookmarkItem key={item.id} item={item} />
            ))}
          </SortableContext>

          <Separator className="my-2 bg-white/10" />

          <div 
            className="flex items-center py-1.5 px-2 text-sm rounded-md text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
            onClick={toggleTabsSpotlight}
          >
            <Plus className="h-4 w-4 mr-3" />
            <span>New Tab</span>
          </div>

          {/* Tabs */}
          <SortableContext
            items={tabs}
            strategy={verticalListSortingStrategy}
            id="tabs"
          >
            {tabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                item={tab}
                onRename={handleTabRename}
                onClose={handleTabClose}
                onClick={handleTabClick}
              />
            ))}
          </SortableContext>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <User className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
