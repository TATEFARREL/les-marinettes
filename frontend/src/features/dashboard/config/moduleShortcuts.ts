import type { LucideIcon } from 'lucide-react'
import { Banknote, FileUser, ImageIcon, PenLine } from 'lucide-react'

export type ModuleShortcut = {
  to: string
  title: string
  description: string
  icon: LucideIcon
}

/** Navigation cards for the admin shell — pure data, no React state. */
export function getModuleShortcuts(options: {
  isTeacher: boolean
  isFinance: boolean
}): ModuleShortcut[] {
  const { isTeacher, isFinance } = options
  const all: ModuleShortcut[] = [
    {
      to: '/cms',
      title: 'Contenu du site',
      description: 'Accueil, pages À propos et admissions, organigramme.',
      icon: PenLine,
    },
    {
      to: '/gallery',
      title: 'Galerie',
      description: 'Albums, page galerie et envoi de fichiers.',
      icon: ImageIcon,
    },
    {
      to: '/admissions',
      title: 'Admissions',
      description: 'Candidats et dossiers d’inscription.',
      icon: FileUser,
    },
    {
      to: '/finance',
      title: 'Finance',
      description: 'Élèves, factures, paiements et export CSV.',
      icon: Banknote,
    },
  ]

  return all.filter((m) => {
    if (m.to === '/cms' || m.to === '/gallery') return isTeacher
    if (m.to === '/finance') return isFinance
    return true
  })
}
