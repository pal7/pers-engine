import { useState } from 'react'
import type { AudienceRule } from '../../types/experiment'

interface EditableRule extends AudienceRule {
  id: string
}

const fieldOptions = [
  'Visitor type',
  'Region',
  'Industry',
  'Page group',
  'Pricing views',
  'Company size',
]

const operatorOptions: AudienceRule['operator'][] = [
  'is',
  'is not',
  'contains',
  'is one of',
  '>=',
  '<=',
  'within',
]

const createRule = (index: number): EditableRule => ({
  id: `rule-${index}`,
  field: 'Visitor type',
  operator: 'is',
  value: 'Returning',
})

export function AudienceRuleBuilder() {
  const [rules, setRules] = useState<EditableRule[]>([
    createRule(1),
    {
      id: 'rule-2',
      field: 'Page group',
      operator: 'is one of',
      value: 'Pricing, Demo request',
    },
  ])

  const updateRule = <K extends keyof Omit<EditableRule, 'id'>>(
    ruleId: string,
    field: K,
    value: EditableRule[K],
  ) => {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              [field]: value,
            }
          : rule,
      ),
    )
  }

  const addRule = () => {
    setRules((current) => [...current, createRule(current.length + 1)])
  }

  const removeRule = (ruleId: string) => {
    setRules((current) => current.filter((rule) => rule.id !== ruleId))
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Audience rule builder</h2>
          <p>Minimal AND-rule editor for MVP audience configuration.</p>
        </div>
      </div>

      <div className="audience-rule-builder__stack">
        {rules.map((rule, index) => (
          <div className="audience-rule-builder__row" key={rule.id}>
            <span className="audience-rule-builder__connector">
              {index === 0 ? 'IF' : 'AND'}
            </span>
            <select
              className="field__control"
              onChange={(event) => updateRule(rule.id, 'field', event.target.value)}
              value={rule.field}
            >
              {fieldOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="field__control"
              onChange={(event) =>
                updateRule(
                  rule.id,
                  'operator',
                  event.target.value as AudienceRule['operator'],
                )
              }
              value={rule.operator}
            >
              {operatorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              onChange={(event) => updateRule(rule.id, 'value', event.target.value)}
              placeholder="Value"
              type="text"
              value={rule.value}
            />
            <button
              className="button audience-rule-builder__remove"
              onClick={() => removeRule(rule.id)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button className="button button--primary audience-rule-builder__add" onClick={addRule} type="button">
        Add rule
      </button>
    </section>
  )
}
