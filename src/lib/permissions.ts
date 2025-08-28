// Permission resolver for server roles and per-channel overwrites
// This utility is designed to work with the extended Prisma schema changes.

export type PermissionKey =
  | 'VIEW_CHANNEL'
  | 'READ_MESSAGE_HISTORY'
  | 'SEND_MESSAGES'
  | 'EDIT_MESSAGES'
  | 'MANAGE_CHANNELS'
  | 'DELETE_OTHERS_MESSAGES'
  | 'ADD_REACTIONS'
  | 'SEND_GIFS'

export type PermissionSet = Record<PermissionKey, boolean>

export interface RoleShape {
  id: string
  name: string
  // Either legacy comma string or array
  permissions?: string | string[] | null
}

export interface ChannelOverwriteShape {
  channelId: string
  roleId?: string | null
  userId?: string | null
  // Structured flags coming from ChannelPermission
  canView?: boolean
  canRead?: boolean
  canSend?: boolean
  canEdit?: boolean
  canManage?: boolean
  canDeleteOthers?: boolean
  canReact?: boolean
  canSendGifs?: boolean
  // Legacy single permission string (ignored if structured flags exist)
  permission?: string | null
}

export interface ResolveInput {
  userId: string
  serverId: string
  roleIds: string[] // all roles assigned to the member
  rolesById: Record<string, RoleShape>
  channelOverwrites?: ChannelOverwriteShape[]
}

export interface ResolvedPermissions {
  base: PermissionSet
  withChannel: (channelId: string) => PermissionSet
  can: (perm: PermissionKey, channelId?: string) => boolean
}

const ALL_FALSE = () => ({
  VIEW_CHANNEL: false,
  READ_MESSAGE_HISTORY: false,
  SEND_MESSAGES: false,
  EDIT_MESSAGES: false,
  MANAGE_CHANNELS: false,
  DELETE_OTHERS_MESSAGES: false,
  ADD_REACTIONS: false,
  SEND_GIFS: false,
} satisfies PermissionSet)

const DEFAULTS = () => ({
  VIEW_CHANNEL: true,
  READ_MESSAGE_HISTORY: true,
  SEND_MESSAGES: true,
  EDIT_MESSAGES: false,
  MANAGE_CHANNELS: false,
  DELETE_OTHERS_MESSAGES: false,
  ADD_REACTIONS: true,
  SEND_GIFS: true,
} satisfies PermissionSet)

function parseRolePermissions(permissions?: string | string[] | null): PermissionKey[] {
  if (!permissions) return []
  if (Array.isArray(permissions)) return permissions.filter(Boolean) as PermissionKey[]
  // legacy: comma/space separated
  return permissions
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean) as PermissionKey[]
}

function applyKeys(target: PermissionSet, keys: PermissionKey[], value: boolean) {
  for (const k of keys) {
    if (k === 'VIEW_CHANNEL') target.VIEW_CHANNEL = value
    else if (k === 'READ_MESSAGE_HISTORY') target.READ_MESSAGE_HISTORY = value
    else if (k === 'SEND_MESSAGES') target.SEND_MESSAGES = value
    else if (k === 'EDIT_MESSAGES') target.EDIT_MESSAGES = value
    else if (k === 'MANAGE_CHANNELS') target.MANAGE_CHANNELS = value
    else if (k === 'DELETE_OTHERS_MESSAGES') target.DELETE_OTHERS_MESSAGES = value
    else if (k === 'ADD_REACTIONS') target.ADD_REACTIONS = value
    else if (k === 'SEND_GIFS') target.SEND_GIFS = value
  }
}

function mergeRolePermissions(roleIds: string[], rolesById: Record<string, RoleShape>): PermissionSet {
  const result = DEFAULTS()
  for (const id of roleIds) {
    const role = rolesById[id]
    if (!role) continue
    const keys = parseRolePermissions(role.permissions)
    applyKeys(result, keys, true)
  }
  return result
}

function applyChannelOverwrite(base: PermissionSet, o: ChannelOverwriteShape): PermissionSet {
  const out: PermissionSet = { ...base }

  // If structured flags exist, they take precedence
  let usedStructured = false
  if (
    o.canView !== undefined || o.canRead !== undefined || o.canSend !== undefined ||
    o.canEdit !== undefined || o.canManage !== undefined || o.canDeleteOthers !== undefined ||
    o.canReact !== undefined || o.canSendGifs !== undefined
  ) {
    usedStructured = true
    if (o.canView !== undefined) out.VIEW_CHANNEL = o.canView
    if (o.canRead !== undefined) out.READ_MESSAGE_HISTORY = o.canRead
    if (o.canSend !== undefined) out.SEND_MESSAGES = o.canSend
    if (o.canEdit !== undefined) out.EDIT_MESSAGES = o.canEdit
    if (o.canManage !== undefined) out.MANAGE_CHANNELS = o.canManage
    if (o.canDeleteOthers !== undefined) out.DELETE_OTHERS_MESSAGES = o.canDeleteOthers
    if (o.canReact !== undefined) out.ADD_REACTIONS = o.canReact
    if (o.canSendGifs !== undefined) out.SEND_GIFS = o.canSendGifs
  }

  // Legacy single permission string: treat as a boolean enable for that key
  if (!usedStructured && o.permission) {
    const keys = parseRolePermissions(o.permission)
    applyKeys(out, keys, true)
  }
  return out
}

export function resolvePermissions(input: ResolveInput): ResolvedPermissions {
  const base = mergeRolePermissions(input.roleIds, input.rolesById)

  const withChannel = (channelId: string) => {
    let current = { ...base }
    const overwrites = (input.channelOverwrites || []).filter((o) => o.channelId === channelId)

    // User-specific overwrites should apply last; role overwrites before that.
    const roleOverwrites = overwrites.filter((o) => o.roleId)
    const userOverwrites = overwrites.filter((o) => o.userId === input.userId)

    for (const o of roleOverwrites) current = applyChannelOverwrite(current, o)
    for (const o of userOverwrites) current = applyChannelOverwrite(current, o)

    return current
  }

  const can = (perm: PermissionKey, channelId?: string) => {
    const set = channelId ? withChannel(channelId) : base
    return set[perm]
  }

  return { base, withChannel, can }
}

export function ensureCanOrThrow(check: boolean, message: string) {
  if (!check) throw new Error(message)
}
