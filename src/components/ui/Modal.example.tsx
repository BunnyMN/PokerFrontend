/**
 * Example usage of Modal and Popup components
 * 
 * This file demonstrates how to use the popup components.
 * You can reference this when implementing popups based on your Figma design.
 */

import { useState } from 'react'
import { Modal } from './Modal'
import { Popup } from './Popup'
import { Button } from './Button'
import { Input } from './Input'
import { useModal } from '../../hooks/useModal'

// Example 1: Basic Modal
export function BasicModalExample() {
  const { isOpen, open, close } = useModal()

  return (
    <>
      <Button onClick={open}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={close} title="Basic Modal">
        <p className="text-[var(--text)]">
          This is a basic modal with glass morphism styling.
        </p>
      </Modal>
    </>
  )
}

// Example 2: Popup with Actions
export function PopupWithActionsExample() {
  const { isOpen, open, close } = useModal()

  return (
    <>
      <Button onClick={open}>Open Popup</Button>
      <Popup
        isOpen={isOpen}
        onClose={close}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        actions={{
          primary: {
            label: 'Confirm',
            onClick: () => {
              console.log('Confirmed!')
              close()
            },
            variant: 'primary',
          },
          secondary: {
            label: 'Cancel',
            onClick: close,
            variant: 'secondary',
          },
        }}
      >
        <p className="text-[var(--text)]">
          This action cannot be undone.
        </p>
      </Popup>
    </>
  )
}

// Example 3: Form in Modal
export function FormModalExample() {
  const { isOpen, open, close } = useModal()
  const [value, setValue] = useState('')

  return (
    <>
      <Button onClick={open}>Open Form Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Create New Item"
        description="Fill in the details below"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            console.log('Submitted:', value)
            close()
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter name"
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// Example 4: Different Sizes
export function ModalSizesExample() {
  const sm = useModal()
  const md = useModal()
  const lg = useModal()

  return (
    <div className="flex gap-4">
      <Button onClick={sm.open}>Small</Button>
      <Button onClick={md.open}>Medium</Button>
      <Button onClick={lg.open}>Large</Button>

      <Modal isOpen={sm.isOpen} onClose={sm.close} size="sm" title="Small Modal">
        <p>Small modal content</p>
      </Modal>

      <Modal isOpen={md.isOpen} onClose={md.close} size="md" title="Medium Modal">
        <p>Medium modal content</p>
      </Modal>

      <Modal isOpen={lg.isOpen} onClose={lg.close} size="lg" title="Large Modal">
        <p>Large modal content</p>
      </Modal>
    </div>
  )
}
