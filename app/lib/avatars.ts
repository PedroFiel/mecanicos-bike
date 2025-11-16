export interface Avatar {
  id: string
  name: string
  imagePath: string
}

export const AVAILABLE_AVATARS: Avatar[] = [
  {
    id: "avatar-1",
    name: "Avatar 1",
    imagePath: "/avatars/avatar-1.jpg",
  },
  {
    id: "avatar-2",
    name: "Avatar 2",
    imagePath: "/avatars/avatar-2.jpg",
  }
]

export function getAvatarById(id: string | null | undefined): Avatar {
  if (!id) {
    return AVAILABLE_AVATARS[0]
  }
  
  return AVAILABLE_AVATARS.find(avatar => avatar.id === id) || AVAILABLE_AVATARS[0]
}

export function getDefaultAvatar(): Avatar {
  return AVAILABLE_AVATARS[0]
}

