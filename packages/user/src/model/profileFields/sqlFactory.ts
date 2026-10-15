import { DefaultSqlFactory, SortInput } from "@prefabs.tech/fastify-slonik";
import humps from "humps";
import { FragmentSqlToken, QuerySqlToken, sql } from "slonik";
import z from "zod";

import {
  TABLE_USER_PROFILE_FIELD_OPTIONS,
  TABLE_USER_PROFILE_FIELD_OPTIONS_I18N,
  TABLE_USER_PROFILE_FIELDS,
  TABLE_USER_PROFILE_FIELDS_I18N,
} from "../../constants";

class ProfileFieldSqlFactory extends DefaultSqlFactory {
  get table(): string {
    return this.getTableNames().profileFields;
  }

  getAllSql(fields: string[], sort?: SortInput[]): QuerySqlToken {
    const identifiers = [];

    const fieldsObject: Record<string, true> = {};

    for (const field of fields) {
      identifiers.push(sql.identifier([humps.decamelize(field)]));
      fieldsObject[humps.camelize(field)] = true;
    }

    const allSchema =
      this.validationSchema._def.typeName === "ZodObject"
        ? (this.validationSchema as z.AnyZodObject).pick(fieldsObject)
        : z.any();

    return sql.type(allSchema)`
      SELECT ${sql.join(identifiers, sql.fragment`, `)},
      COALESCE(user_profile_fields_i18n_agg.data, '[]') as i18n,
      COALESCE(options_agg.data, '[]') as options
      FROM ${this.tableFragment}
      ${this.getProfileFieldsI18nJoinFragment("i")}
      ${this.getProfileFieldOptionsJoinFragment("o")}
      ${this.getWhereFragment()}
      ${this.getSortFragment(sort)}
    `;
  }

  protected getAdditionalFilterFragments(): FragmentSqlToken[] {
    return [sql.fragment`${this.tableIdentifier}.disabled IS NOT TRUE`];
  }

  private getProfileFieldOptionsI18nJoinFragment(
    profileFieldOptionsI18nAlias: string,
  ): FragmentSqlToken {
    const { profileFieldOptionsI18n } = this.getTableNames();

    return sql.fragment`
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'id', ${sql.identifier([profileFieldOptionsI18nAlias])}.id,
          'locale', ${sql.identifier([profileFieldOptionsI18nAlias])}.locale,
          'label', ${sql.identifier([profileFieldOptionsI18nAlias])}.label,
          'description', ${sql.identifier([profileFieldOptionsI18nAlias])}.description,
          'createdAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldOptionsI18nAlias])}.created_at) AS INTEGER),
          'updatedAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldOptionsI18nAlias])}.updated_at) AS INTEGER)
        )) as data
        FROM ${sql.identifier([profileFieldOptionsI18n])} ${sql.identifier([profileFieldOptionsI18nAlias])}
        WHERE ${sql.identifier([profileFieldOptionsI18nAlias])}.id = o.id
      ) o_i18n ON true
    `;
  }

  private getProfileFieldOptionsJoinFragment(
    profileFieldOptionsAlias: string,
  ): FragmentSqlToken {
    const { profileFieldOptions } = this.getTableNames();

    return sql.fragment`
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'id', ${sql.identifier([profileFieldOptionsAlias])}.id,
          'value', ${sql.identifier([profileFieldOptionsAlias])}.value,
          'imageId', ${sql.identifier([profileFieldOptionsAlias])}.image_id,
          'rank', ${sql.identifier([profileFieldOptionsAlias])}.rank,
          'createdAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldOptionsAlias])}.created_at) AS INTEGER),
          'updatedAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldOptionsAlias])}.updated_at) AS INTEGER),
          'i18n', COALESCE(o_i18n.data, '[]')
        )) as data
        FROM ${sql.identifier([profileFieldOptions])} ${sql.identifier([profileFieldOptionsAlias])}
        ${this.getProfileFieldOptionsI18nJoinFragment("oi")}
        WHERE ${sql.identifier([profileFieldOptionsAlias])}.field_id = ${sql.identifier([this.table, "id"])}
      ) options_agg ON true
    `;
  }

  private getProfileFieldsI18nJoinFragment(
    profileFieldsI18nAlias: string,
  ): FragmentSqlToken {
    const { profileFieldsI18n } = this.getTableNames();

    return sql.fragment`
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object(
          'id', ${sql.identifier([profileFieldsI18nAlias])}.id,
          'locale', ${sql.identifier([profileFieldsI18nAlias])}.locale,
          'label', ${sql.identifier([profileFieldsI18nAlias])}.label,
          'description', ${sql.identifier([profileFieldsI18nAlias])}.description,
          'placeholder', ${sql.identifier([profileFieldsI18nAlias])}.placeholder,
          'createdAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldsI18nAlias])}.created_at) AS INTEGER),
          'updatedAt', CAST(EXTRACT(EPOCH FROM ${sql.identifier([profileFieldsI18nAlias])}.updated_at) AS INTEGER)
        )) as data
        FROM ${sql.identifier([profileFieldsI18n])} ${sql.identifier([profileFieldsI18nAlias])}
        WHERE ${sql.identifier([profileFieldsI18nAlias])}.id = ${sql.identifier([this.table, "id"])}
      ) user_profile_fields_i18n_agg ON true
    `;
  }

  private getTableNames(): {
    profileFieldOptions: string;
    profileFieldOptionsI18n: string;
    profileFields: string;
    profileFieldsI18n: string;
  } {
    return {
      profileFieldOptions:
        this.config.user.tables?.userProfileFieldOptions?.name ||
        TABLE_USER_PROFILE_FIELD_OPTIONS,
      profileFieldOptionsI18n:
        this.config.user.tables?.userProfileFieldOptionsI18n?.name ||
        TABLE_USER_PROFILE_FIELD_OPTIONS_I18N,
      profileFields:
        this.config.user.tables?.userProfileFields?.name ||
        TABLE_USER_PROFILE_FIELDS,
      profileFieldsI18n:
        this.config.user.tables?.userProfileFieldsI18n?.name ||
        TABLE_USER_PROFILE_FIELDS_I18N,
    };
  }
}

export default ProfileFieldSqlFactory;
