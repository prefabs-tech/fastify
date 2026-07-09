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
  static readonly FIELD_OPTIONS_I18N_TABLE =
    TABLE_USER_PROFILE_FIELD_OPTIONS_I18N;
  static readonly FIELD_OPTIONS_TABLE = TABLE_USER_PROFILE_FIELD_OPTIONS;
  static readonly I18N_TABLE = TABLE_USER_PROFILE_FIELDS_I18N;
  static readonly TABLE = TABLE_USER_PROFILE_FIELDS;

  static getProfileFieldOptionsI18nJoinFragment = (
    profileFieldOptionsI18nAlias: string,
  ): FragmentSqlToken => {
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
        FROM ${sql.identifier([ProfileFieldSqlFactory.FIELD_OPTIONS_I18N_TABLE])} ${sql.identifier([profileFieldOptionsI18nAlias])}
        WHERE ${sql.identifier([profileFieldOptionsI18nAlias])}.id = o.id
      ) o_i18n ON true
    `;
  };

  static getProfileFieldOptionsJoinFragment = (
    profileFieldOptionsAlias: string,
  ): FragmentSqlToken => {
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
        FROM ${sql.identifier([ProfileFieldSqlFactory.FIELD_OPTIONS_TABLE])} ${sql.identifier([profileFieldOptionsAlias])}
        ${ProfileFieldSqlFactory.getProfileFieldOptionsI18nJoinFragment("oi")}
        WHERE ${sql.identifier([profileFieldOptionsAlias])}.field_id = ${sql.identifier([ProfileFieldSqlFactory.TABLE, "id"])}
      ) options_agg ON true
    `;
  };

  static getProfileFieldsI18nJoinFragment = (
    profileFieldsI18nAlias: string,
  ): FragmentSqlToken => {
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
        FROM ${sql.identifier([ProfileFieldSqlFactory.I18N_TABLE])} ${sql.identifier([profileFieldsI18nAlias])}
        WHERE ${sql.identifier([profileFieldsI18nAlias])}.id = ${sql.identifier([ProfileFieldSqlFactory.TABLE, "id"])}
      ) user_profile_fields_i18n_agg ON true
    `;
  };

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
      ${ProfileFieldSqlFactory.getProfileFieldsI18nJoinFragment("i")}
      ${ProfileFieldSqlFactory.getProfileFieldOptionsJoinFragment("o")}
      ${this.getWhereFragment()}
      ${this.getSortFragment(sort)}
    `;
  }
}

export default ProfileFieldSqlFactory;
