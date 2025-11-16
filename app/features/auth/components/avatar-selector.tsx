import { useState } from "react"
import { AVAILABLE_AVATARS, getAvatarById } from "~/lib/avatars"
import { cn } from "~/lib/utils"
import { Field, FieldLabel, FieldDescription } from "~/components/ui/field"
import { Button } from "~/components/ui/button"
import { IconEdit, IconX, IconCheck } from "@tabler/icons-react"

interface AvatarSelectorProps {
  defaultValue?: string | null
  error?: string
  userName?: string
}

export function AvatarSelector({ defaultValue, error, userName = "U" }: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(
    defaultValue || ""
  )
  const [isEditing, setIsEditing] = useState(false)
  const [tempAvatar, setTempAvatar] = useState(defaultValue || "")

  const hasAvatar = selectedAvatar && selectedAvatar.trim() !== ""
  const currentAvatar = hasAvatar ? getAvatarById(selectedAvatar) : null

  const handleEditClick = () => {
    setTempAvatar(selectedAvatar)
    setIsEditing(true)
  }

  const handleConfirm = () => {
    setSelectedAvatar(tempAvatar)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempAvatar(selectedAvatar)
    setIsEditing(false)
  }

  return (
    <Field>
      <input type="hidden" name="image" value={selectedAvatar} />

      <div className="mt-2 flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
        <div className="shrink-0 h-20 w-20 flex items-center justify-center rounded-lg bg-background border-2 border-primary overflow-hidden">
          {hasAvatar && currentAvatar ? (
            <img 
              src={currentAvatar.imagePath} 
              alt={currentAvatar.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl font-semibold text-muted-foreground">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Avatar Selecionado</p>
          <p className="text-base font-semibold truncate">
            {hasAvatar && currentAvatar ? currentAvatar.name : "Inicial do nome"}
          </p>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditClick}
          >
            <IconEdit className="h-4 w-4 mr-2" />
            Alterar
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => setTempAvatar("")}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                "hover:shadow-md hover:-translate-y-0.5",
                tempAvatar === ""
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 bg-background"
              )}
              title="Usar inicial do nome"
            >
              <div className={cn(
                "h-12 w-12 flex items-center justify-center rounded-full transition-colors",
                tempAvatar === "" ? "bg-primary/10" : "bg-muted"
              )}>
                <span className={cn(
                  "text-xl font-bold transition-colors",
                  tempAvatar === "" ? "text-primary" : "text-muted-foreground"
                )}>
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium truncate w-full text-center transition-colors",
                tempAvatar === "" ? "text-primary" : "text-muted-foreground"
              )}>
                Inicial
              </span>
              {tempAvatar === "" && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
              )}
            </button>

            {AVAILABLE_AVATARS.map((avatar) => {
              const isSelected = tempAvatar === avatar.id

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setTempAvatar(avatar.id)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50 bg-background"
                  )}
                  title={avatar.name}
                >
                  <div className={cn(
                    "h-12 w-12 rounded-full overflow-hidden border-2 transition-colors",
                    isSelected ? "border-primary" : "border-transparent"
                  )}>
                    <img 
                      src={avatar.imagePath} 
                      alt={avatar.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs text-muted-foreground flex items-center justify-center h-full">?</span>`
                        }
                      }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium truncate w-full text-center transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {avatar.name}
                  </span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
              size="sm"
            >
              <IconCheck className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              size="sm"
            >
              <IconX className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <FieldDescription className="text-red-500 mt-3">
          {error}
        </FieldDescription>
      )}
    </Field>
  )
}

