"use client"

import { useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, ChevronDown, ChevronRight, Github } from "lucide-react"

// Types for our data structure
interface Item {
  id: string
  content: string
}

interface Group {
  id: string
  title: string
  items: Item[]
  isCollapsed?: boolean
}

// The individual sortable item component
function SortableItem({ item, groupId }: { item: Item; groupId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "item",
      item,
      groupId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`pl-6 mb-2 ${isDragging ? "z-10" : ""}`}>
      <Card className="border shadow-sm">
        <CardContent className="p-3 flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab touch-manipulation">
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1">{item.content}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// The sortable group component
function SortableGroup({ group, onToggleCollapse }: { group: Group; onToggleCollapse: (groupId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: {
      type: "group",
      group,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`mb-4 ${isDragging ? "z-10" : ""}`}>
      <Card className={`border ${isDragging ? "shadow-lg ring-2 ring-primary/20" : "shadow-sm"}`}>
        <CardHeader className="p-4 pb-2" {...attributes} {...listeners}>
          <div className="flex items-center cursor-grab">
            <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
            <CardTitle className="text-lg flex-1 flex items-center">
              {group.title}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleCollapse(group.id)
                }}
                className="ml-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {group.isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </CardTitle>
          </div>
        </CardHeader>
        {!group.isCollapsed && (
          <CardContent className="p-4 pt-0">
            <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              {group.items.map((item) => (
                <SortableItem key={item.id} item={item} groupId={group.id} />
              ))}
            </SortableContext>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// Item overlay component for drag preview
function ItemOverlay({ item }: { item: Item }) {
  return (
    <Card className="border shadow-md">
      <CardContent className="p-3 flex items-center gap-3">
        <GripVertical className="h-5 w-5 text-gray-400" />
        <div className="flex-1">{item.content}</div>
      </CardContent>
    </Card>
  )
}

// Group overlay component for drag preview
function GroupOverlay({ group }: { group: Group }) {
  return (
    <Card className="border shadow-md">
      <CardHeader className="p-4">
        <div className="flex items-center">
          <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
          <CardTitle className="text-lg">{group.title}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  )
}

export default function SortableNestedList() {
  // Initial groups and items
  const [groups, setGroups] = useState<Group[]>([
    {
      id: "group-1",
      title: "To Do",
      items: [
        { id: "item-1", content: "Research project requirements" },
        { id: "item-2", content: "Create project plan" },
        { id: "item-3", content: "Set up development environment" },
      ],
    },
    {
      id: "group-2",
      title: "In Progress",
      items: [
        { id: "item-4", content: "Implement core features" },
        { id: "item-5", content: "Design user interface" },
      ],
    },
    {
      id: "group-3",
      title: "Completed",
      items: [
        { id: "item-6", content: "Project kickoff meeting" },
        { id: "item-7", content: "Requirements gathering" },
      ],
    },
  ])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeData, setActiveData] = useState<any>(null)

  // Configure the sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Toggle group collapse
  const handleToggleCollapse = (groupId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => (group.id === groupId ? { ...group, isCollapsed: !group.isCollapsed } : group)),
    )
  }

  // Handle drag start
  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveId(active.id as string)
    setActiveData(active.data.current)
  }

  // Find the group that contains an item
  function findGroupOfItem(itemId: string) {
    return groups.find((group) => group.items.some((item) => item.id === itemId))
  }

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setActiveData(null)
      return
    }

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    // If we're dragging a group
    if (activeType === "group" && active.id !== over.id) {
      // Handle group sorting regardless of what it's dropped on
      const overGroupId = overType === "group" ? over.id : over.data.current?.groupId

      if (overGroupId) {
        setGroups((groups) => {
          const oldIndex = groups.findIndex((group) => group.id === active.id)
          const newIndex = groups.findIndex((group) =>
            overType === "group" ? group.id === over.id : group.id === overGroupId,
          )
          return arrayMove(groups, oldIndex, newIndex)
        })
      }
    }
    // If we're dragging an item
    else if (activeType === "item") {
      const activeGroup = active.data.current.groupId
      const overIsGroup = overType === "group"
      const overGroup = overIsGroup ? over.id : over.data.current?.groupId

      // If we're dropping onto a group directly (not an item)
      if (overIsGroup) {
        // Move the item to the end of the target group
        setGroups((groups) => {
          const updatedGroups = [...groups]

          // Remove item from source group
          const sourceGroupIndex = updatedGroups.findIndex((g) => g.id === activeGroup)
          const itemIndex = updatedGroups[sourceGroupIndex].items.findIndex((i) => i.id === active.id)
          const [movedItem] = updatedGroups[sourceGroupIndex].items.splice(itemIndex, 1)

          // Add item to target group
          const targetGroupIndex = updatedGroups.findIndex((g) => g.id === overGroup)
          updatedGroups[targetGroupIndex].items.push(movedItem)

          return updatedGroups
        })
      }
      // If we're dropping onto another item
      else if (active.id !== over.id) {
        setGroups((groups) => {
          const updatedGroups = [...groups]

          // If moving within the same group
          if (activeGroup === overGroup) {
            const groupIndex = updatedGroups.findIndex((g) => g.id === activeGroup)
            const oldIndex = updatedGroups[groupIndex].items.findIndex((i) => i.id === active.id)
            const newIndex = updatedGroups[groupIndex].items.findIndex((i) => i.id === over.id)
            updatedGroups[groupIndex].items = arrayMove(updatedGroups[groupIndex].items, oldIndex, newIndex)
          }
          // If moving between different groups
          else {
            // Remove from source group
            const sourceGroupIndex = updatedGroups.findIndex((g) => g.id === activeGroup)
            const itemIndex = updatedGroups[sourceGroupIndex].items.findIndex((i) => i.id === active.id)
            const [movedItem] = updatedGroups[sourceGroupIndex].items.splice(itemIndex, 1)

            // Add to target group
            const targetGroupIndex = updatedGroups.findIndex((g) => g.id === overGroup)
            const targetIndex = updatedGroups[targetGroupIndex].items.findIndex((i) => i.id === over.id)
            updatedGroups[targetGroupIndex].items.splice(targetIndex, 0, movedItem)
          }

          return updatedGroups
        })
      }
    }

    setActiveId(null)
    setActiveData(null)
  }

  // Find the active item or group for the drag overlay
  const activeGroup = activeData?.type === "group" ? groups.find((g) => g.id === activeId) : null
  const activeItem =
    activeData?.type === "item" ? findGroupOfItem(activeId as string)?.items.find((i) => i.id === activeId) : null

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="flex justify-center mb-4">
        <a
          href="https://github.com/UpendraNallapareddy/v0-drag-and-drop-list-su"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <Github className="h-4 w-4" />
          View on GitHub
        </a>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center">Sortable Groups & Items</h2>
      <p className="text-gray-500 mb-6 text-center">Drag groups to reorder them or drag items between groups</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={groups.map((group) => group.id)} strategy={verticalListSortingStrategy}>
          {groups.map((group) => (
            <SortableGroup key={group.id} group={group} onToggleCollapse={handleToggleCollapse} />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeId && activeData?.type === "group" && activeGroup ? (
            <GroupOverlay group={activeGroup} />
          ) : activeId && activeData?.type === "item" && activeItem ? (
            <ItemOverlay item={activeItem} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
