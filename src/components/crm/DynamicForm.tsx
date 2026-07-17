"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Button from "@/components/ui/Button";
import type {
  CRMFieldConfig,
  CRMFormSectionConfig,
  CRMModuleConfig,
} from "@/types/crm-config";

import DynamicField from "./DynamicField";
import type { CRMRecord } from "./CRMDataTable";

export type CRMFormValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

export type CRMFormValues = Record<
  string,
  CRMFormValue
>;

type CRMFormErrors = Record<string, string>;

type DynamicFormProps = {
  module: CRMModuleConfig;
  initialRecord?: CRMRecord | null;

  submitLabel?: string;
  cancelLabel?: string;

  isSubmitting?: boolean;

  onSubmit: (
    values: CRMFormValues,
  ) => void | Promise<void>;

  onCancel?: () => void;
};

type FormSectionGroup = {
  section: CRMFormSectionConfig;
  fields: CRMFieldConfig[];
};

function getFormFields(
  module: CRMModuleConfig,
): CRMFieldConfig[] {
  return [...module.fields]
    .filter(
      (field) =>
        field.showInForm !== false &&
        field.hidden !== true,
    )
    .sort(
      (a, b) =>
        (a.formOrder ??
          Number.MAX_SAFE_INTEGER) -
        (b.formOrder ??
          Number.MAX_SAFE_INTEGER),
    );
}

function getVisibleSections(
  module: CRMModuleConfig,
): CRMFormSectionConfig[] {
  return [...(module.formSections ?? [])]
    .filter(
      (section) =>
        section.visible !== false,
    )
    .sort(
      (a, b) => a.order - b.order,
    );
}

function buildSectionGroups(
  module: CRMModuleConfig,
  fields: CRMFieldConfig[],
): FormSectionGroup[] {
  const sections = getVisibleSections(module);

  if (sections.length === 0) {
    return [];
  }

  return sections.map((section) => ({
    section,
    fields: fields
      .filter(
        (field) =>
          field.formSectionId === section.id,
      )
      .sort((a, b) => {
        const rowDifference =
          (a.formRow ??
            Number.MAX_SAFE_INTEGER) -
          (b.formRow ??
            Number.MAX_SAFE_INTEGER);

        if (rowDifference !== 0) {
          return rowDifference;
        }

        const columnDifference =
          (a.formColumn ??
            Number.MAX_SAFE_INTEGER) -
          (b.formColumn ??
            Number.MAX_SAFE_INTEGER);

        if (columnDifference !== 0) {
          return columnDifference;
        }

        return (
          (a.formOrder ??
            Number.MAX_SAFE_INTEGER) -
          (b.formOrder ??
            Number.MAX_SAFE_INTEGER)
        );
      }),
  }));
}

function getUnsectionedFields(
  fields: CRMFieldConfig[],
): CRMFieldConfig[] {
  return fields.filter(
    (field) => !field.formSectionId,
  );
}

function getInitialValue(
  field: CRMFieldConfig,
  record?: CRMRecord | null,
): CRMFormValue {
  const recordValue = record?.[field.key];

  if (recordValue !== undefined) {
    if (
      field.type === "lookup" &&
      typeof recordValue === "object" &&
      recordValue !== null &&
      !Array.isArray(recordValue)
    ) {
      const lookupValue = recordValue as {
        id?: string;
        value?: string;
      };

      return (
        lookupValue.id ??
        lookupValue.value ??
        ""
      );
    }

    return recordValue as CRMFormValue;
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === "checkbox") {
    return false;
  }

  if (field.type === "multiselect") {
    return [];
  }

  return "";
}

function buildInitialValues(
  fields: CRMFieldConfig[],
  record?: CRMRecord | null,
): CRMFormValues {
  return fields.reduce<CRMFormValues>(
    (values, field) => {
      values[field.key] = getInitialValue(
        field,
        record,
      );

      return values;
    },
    {},
  );
}

function isEmptyValue(
  value: CRMFormValue,
): boolean {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function validateField(
  field: CRMFieldConfig,
  value: CRMFormValue,
): string | null {
  if (
    field.required &&
    isEmptyValue(value)
  ) {
    return `${field.label} es obligatorio.`;
  }

  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value === "string") {
    const minLength =
      field.validation?.minLength;

    const maxLength =
      field.validation?.maxLength;

    if (
      minLength !== undefined &&
      value.trim().length < minLength
    ) {
      return (
        field.validation?.message ??
        `${field.label} debe tener al menos ${minLength} caracteres.`
      );
    }

    if (
      maxLength !== undefined &&
      value.length > maxLength
    ) {
      return (
        field.validation?.message ??
        `${field.label} no puede superar ${maxLength} caracteres.`
      );
    }

    if (field.validation?.pattern) {
      const pattern = new RegExp(
        field.validation.pattern,
      );

      if (!pattern.test(value)) {
        return (
          field.validation.message ??
          `${field.label} no tiene un formato válido.`
        );
      }
    }
  }

  if (typeof value === "number") {
    const min = field.validation?.min;
    const max = field.validation?.max;

    if (
      min !== undefined &&
      value < min
    ) {
      return (
        field.validation?.message ??
        `${field.label} debe ser mayor o igual a ${min}.`
      );
    }

    if (
      max !== undefined &&
      value > max
    ) {
      return (
        field.validation?.message ??
        `${field.label} debe ser menor o igual a ${max}.`
      );
    }
  }

  return null;
}

function validateBusinessRules(
  values: CRMFormValues,
): CRMFormErrors {
  const errors: CRMFormErrors = {};

  const promotionStart =
    values.promotionStart;

  const promotionEnd =
    values.promotionEnd;

  if (
    typeof promotionStart === "string" &&
    typeof promotionEnd === "string" &&
    promotionStart &&
    promotionEnd
  ) {
    const startDate = new Date(
      promotionStart,
    );

    const endDate = new Date(
      promotionEnd,
    );

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate <= startDate
    ) {
      errors.promotionEnd =
        "El fin de la promoción debe ser posterior al inicio.";
    }
  }

  const maximumBenefits =
    values.maximumBenefits;

  const usedBenefits =
    values.usedBenefits;

  if (
    typeof maximumBenefits === "number" &&
    typeof usedBenefits === "number" &&
    usedBenefits > maximumBenefits
  ) {
    errors.maximumBenefits =
      "El máximo de beneficios no puede ser menor que los beneficios entregados.";
  }

  if (
    values.benefitType ===
      "Meses sin intereses" &&
    values.paymentMethod !==
      "Financiamiento"
  ) {
    errors.paymentMethod =
      "Las promociones de meses sin intereses requieren financiamiento.";
  }

  if (
    values.limitPromotion === true &&
    (
      values.maximumBenefits === null ||
      values.maximumBenefits === undefined ||
      values.maximumBenefits === ""
    )
  ) {
    errors.maximumBenefits =
      "Indica el máximo de beneficios cuando la promoción está limitada.";
  }

  return errors;
}

function shouldShowField(
  field: CRMFieldConfig,
  values: CRMFormValues,
): boolean {
  switch (field.key) {
    case "availableMonths":
      return (
        values.benefitType ===
        "Meses sin intereses"
      );

    case "minimumDownPayment":
      return (
        values.paymentMethod ===
        "Financiamiento"
      );

    case "maximumBenefits":
    case "usedBenefits":
      return values.limitPromotion === true;

    default:
      return true;
  }
}

function getDynamicField(
  field: CRMFieldConfig,
  values: CRMFormValues,
): CRMFieldConfig {
  if (field.key === "paymentMethod") {
    if (
      values.benefitType ===
      "Meses sin intereses"
    ) {
      return {
        ...field,
        options: [
          {
            label: "Financiamiento",
            value: "Financiamiento",
          },
        ],
        readOnly: true,
      };
    }

    if (
      values.benefitType ===
        "Descuento (%)" ||
      values.benefitType ===
        "Descuento ($)"
    ) {
      return {
        ...field,
        options: [
          {
            label: "Contado",
            value: "Contado",
          },
        ],
        readOnly: true,
      };
    }

    return {
      ...field,
      readOnly: false,
      options: [
        {
          label: "Contado",
          value: "Contado",
        },
        {
          label: "Financiamiento",
          value: "Financiamiento",
        },
        {
          label: "Ambos",
          value: "Ambos",
        },
      ],
    };
  }

  return field;
}

function getFieldLayoutClassName(
  field: CRMFieldConfig,
): string {
  const classes: string[] = [];

  if (field.formSpan === 2) {
    classes.push("sm:col-span-2");
  }

  /*
   * Los checkbox se alinean con el control
   * de la celda vecina, no con su etiqueta.
   */
  if (field.type === "checkbox") {
    classes.push(
      "flex h-full flex-col justify-end",
    );
  }

  return classes.join(" ");
}

function renderField(
  field: CRMFieldConfig,
  values: CRMFormValues,
  errors: CRMFormErrors,
  handleFieldChange: (
    fieldKey: string,
    value: CRMFormValue,
  ) => void,
) {
  if (!shouldShowField(field, values)) {
    return null;
  }

  const dynamicField = getDynamicField(
    field,
    values,
  );

  return (
    <div
      key={field.key}
      className={getFieldLayoutClassName(
        dynamicField,
      )}
      style={{
        gridRow:
          dynamicField.formRow ??
          undefined,

        gridColumn:
          dynamicField.formSpan === 2
            ? "1 / -1"
            : dynamicField.formColumn ??
              undefined,
      }}
    >
      <DynamicField
        field={dynamicField}
        value={values[field.key]}
        error={errors[field.key]}
        onChange={handleFieldChange}
      />
    </div>
  );
}

function FormSection({
  group,
  values,
  errors,
  onFieldChange,
}: {
  group: FormSectionGroup;
  values: CRMFormValues;
  errors: CRMFormErrors;
  onFieldChange: (
    fieldKey: string,
    value: CRMFormValue,
  ) => void;
}) {
  const columns =
    group.section.columns ?? 2;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <h3 className="text-base font-bold text-slate-950">
          {group.section.title}
        </h3>

        {group.section.description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {group.section.description}
          </p>
        )}
      </header>

      <div
        className={[
          "grid gap-x-6 gap-y-5 p-5 sm:p-6",
          columns === 2
            ? "sm:grid-cols-2"
            : "grid-cols-1",
        ].join(" ")}
      >
        {group.fields.map((field) =>
          renderField(
            field,
            values,
            errors,
            onFieldChange,
          ),
        )}
      </div>
    </section>
  );
}

export default function DynamicForm({
  module,
  initialRecord,
  submitLabel,
  cancelLabel = "Cancelar",
  isSubmitting = false,
  onSubmit,
  onCancel,
}: DynamicFormProps) {
  const formFields = useMemo(
    () => getFormFields(module),
    [module],
  );

  const sectionGroups = useMemo(
    () =>
      buildSectionGroups(
        module,
        formFields,
      ),
    [module, formFields],
  );

  const unsectionedFields = useMemo(
    () =>
      getUnsectionedFields(formFields),
    [formFields],
  );

  const initialValues = useMemo(
    () =>
      buildInitialValues(
        formFields,
        initialRecord,
      ),
    [formFields, initialRecord],
  );

  const [values, setValues] =
    useState<CRMFormValues>(
      initialValues,
    );

  const [errors, setErrors] =
    useState<CRMFormErrors>({});

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  function handleFieldChange(
    fieldKey: string,
    value: CRMFormValue,
  ) {
    setValues((currentValues) => {
      const nextValues: CRMFormValues = {
        ...currentValues,
        [fieldKey]: value,
      };

      /*
       * Meses sin intereses:
       * forma de pago obligatoria en financiamiento.
       */
      if (
        fieldKey === "benefitType" &&
        value === "Meses sin intereses"
      ) {
        nextValues.paymentMethod =
          "Financiamiento";
      }

      /*
       * Descuentos:
       * forma de pago obligatoria en contado.
       */
      if (
        fieldKey === "benefitType" &&
        (
          value === "Descuento (%)" ||
          value === "Descuento ($)"
        )
      ) {
        nextValues.paymentMethod =
          "Contado";

        nextValues.availableMonths = [];
        nextValues.minimumDownPayment =
          null;
      }

      /*
       * Otros beneficios:
       * habilitamos las tres formas de pago.
       */
      if (
        fieldKey === "benefitType" &&
        value !== "Meses sin intereses" &&
        value !== "Descuento (%)" &&
        value !== "Descuento ($)"
      ) {
        nextValues.paymentMethod = "";
        nextValues.availableMonths = [];
      }

      /*
       * Al cambiar la forma de pago y dejar
       * financiamiento, limpiamos el enganche.
       */
      if (
        fieldKey === "paymentMethod" &&
        value !== "Financiamiento"
      ) {
        nextValues.minimumDownPayment =
          null;
      }

      /*
       * Si se desactiva el límite,
       * limpiamos sus campos dependientes.
       */
      if (
        fieldKey === "limitPromotion" &&
        value === false
      ) {
        nextValues.maximumBenefits =
          null;

        nextValues.usedBenefits = 0;
      }

      return nextValues;
    });

    setErrors((currentErrors) => {
      if (!currentErrors[fieldKey]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[fieldKey];

      return nextErrors;
    });
  }

  function validateForm(): {
    isValid: boolean;
    errors: CRMFormErrors;
  } {
    const nextErrors: CRMFormErrors = {};

    formFields
      .filter((field) =>
        shouldShowField(field, values),
      )
      .forEach((field) => {
        const error = validateField(
          field,
          values[field.key],
        );

        if (error) {
          nextErrors[field.key] = error;
        }
      });

    Object.assign(
      nextErrors,
      validateBusinessRules(values),
    );

    setErrors(nextErrors);

    return {
      isValid:
        Object.keys(nextErrors).length ===
        0,
      errors: nextErrors,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validation = validateForm();

    if (!validation.isValid) {
      const firstErrorField =
        Object.keys(
          validation.errors,
        )[0];

      if (firstErrorField) {
        document
          .getElementById(firstErrorField)
          ?.focus();
      }

      return;
    }

    await onSubmit(values);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
      noValidate
    >
      {sectionGroups.map((group) => (
        <FormSection
          key={group.section.id}
          group={group}
          values={values}
          errors={errors}
          onFieldChange={
            handleFieldChange
          }
        />
      ))}

      {unsectionedFields.length > 0 && (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <h3 className="text-base font-bold text-slate-950">
              Información adicional
            </h3>
          </header>

          <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
            {unsectionedFields.map(
              (field) =>
                renderField(
                  field,
                  values,
                  errors,
                  handleFieldChange,
                ),
            )}
          </div>
        </section>
      )}

      {Object.keys(errors).length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            Revisa la información
          </p>

          <p className="mt-1 text-sm leading-6 text-red-600">
            Hay campos obligatorios o reglas
            comerciales que deben corregirse
            antes de guardar.
          </p>
        </section>
      )}

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 pt-5 backdrop-blur sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Guardando..."
            : submitLabel ??
              `Guardar ${module.singularLabel.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}