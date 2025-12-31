// This is all from dynamic filtering repository tutorial, but i've asked claude to make "create_condition"
#[derive(Clone)]
pub enum NumberFilter<T: Clone> {
    Equal(T),
    NotEqual(T),
    GreaterThen(T),
    LowerThen(T),
    IsNull,
    IsNotNull,
}

macro_rules! number_filter {
    ($filter:ident, $dsl_field:expr ) => {{
        match $filter {
            NumberFilter::Equal(value) => Box::new($dsl_field.eq(value).nullable()),
            NumberFilter::NotEqual(value) => Box::new($dsl_field.ne(value).nullable()),
            NumberFilter::GreaterThen(value) => Box::new($dsl_field.gt(value).nullable()),
            NumberFilter::LowerThen(value) => Box::new($dsl_field.lt(value).nullable()),
            NumberFilter::IsNull => Box::new($dsl_field.is_null().nullable()),
            NumberFilter::IsNotNull => Box::new($dsl_field.is_not_null().nullable()),
        }
    }};
}

#[derive(Clone)]
pub enum GeneralFilter<T: Clone> {
    Equal(T),
    NotEqual(T),
    Like(T),
    In(Vec<T>),
}

macro_rules! general_filter {
    ($filter:ident, $dsl_field:expr ) => {{
        match $filter {
            GeneralFilter::Equal(value) => Box::new($dsl_field.eq(value).nullable()),
            GeneralFilter::NotEqual(value) => Box::new($dsl_field.ne(value).nullable()),
            GeneralFilter::Like(value) => Box::new($dsl_field.like(value).nullable()),
            GeneralFilter::In(value) => Box::new($dsl_field.eq_any(value).nullable()),
        }
    }};
}
#[derive(Clone)]
pub enum BooleanFilter {
    True,
    False,
    IsNull,
    IsNotNull,
}

macro_rules! boolean_filter {
    ($filter:ident, $dsl_field:expr ) => {{
        match $filter {
            BooleanFilter::True => Box::new($dsl_field.eq(true).nullable()),
            BooleanFilter::False => Box::new($dsl_field.eq(false).nullable()),
            BooleanFilter::IsNull => Box::new($dsl_field.is_null().nullable()),
            BooleanFilter::IsNotNull => Box::new($dsl_field.is_not_null().nullable()),
        }
    }};
}
#[derive(Clone)]
pub enum AndOr {
    And,
    Or,
}

macro_rules! create_condition {
    ($source:ty, $(($variant:ident, $filter_kind:ident, $dsl_expr:expr)),+ $(,)?) => {
        #[derive(Clone)]
        #[allow(non_camel_case_types)]
       pub enum Condition {
            $(
                $variant(create_condition!(@filter_type $filter_kind)),
            )+
            And(Vec<Condition>),
            Or(Vec<Condition>),
        }

        type BoxedCondition = Box<dyn BoxableExpression<$source, Sqlite, SqlType = diesel::sql_types::Nullable<diesel::sql_types::Bool>>>;

        impl Condition {
            fn to_boxed_condition(self) -> Option<BoxedCondition> {
                Some(match self {
                    $(
                        Condition::$variant(f) => {
                            create_condition!(@filter_macro $filter_kind, f, $dsl_expr)
                        },
                    )+
                    Condition::And(conditions) => match create_filter(conditions, AndOr::And) {
                        Some(boxed_condition) => boxed_condition,
                        None => return None,
                    },
                    Condition::Or(conditions) => match create_filter(conditions, AndOr::Or) {
                        Some(boxed_condition) => boxed_condition,
                        None => return None,
                    },
                })
            }
        }

        fn create_filter(conditions: Vec<Condition>, and_or: AndOr) -> Option<BoxedCondition> {
            conditions
                .into_iter()
                .filter_map::<BoxedCondition, _>(Condition::to_boxed_condition)
                .fold(None, |boxed_conditions, boxed_condition| {
                    Some(match boxed_conditions {
                        Some(bc) => match and_or {
                            AndOr::And => Box::new(bc.and(boxed_condition)),
                            AndOr::Or => Box::new(bc.or(boxed_condition)),
                        },
                        None => boxed_condition,
                    })
                })
        }

        fn create_and_filter(conditions: Vec<Condition>) -> Option<BoxedCondition> {
            create_filter(conditions, AndOr::And)
        }
    };

    // Map filter kind to filter type
    (@filter_type number) => { NumberFilter<i64> };
    (@filter_type string) => { GeneralFilter<String> };
    (@filter_type boolean) => { BooleanFilter };
    (@filter_type $custom_type:ty) => { GeneralFilter<$custom_type> };

    // Helper rules - matching on identifier tokens
    (@filter_macro number, $f:ident, $dsl_expr:expr) => {
        number_filter!($f, $dsl_expr)
    };
    (@filter_macro string, $f:ident, $dsl_expr:expr) => {
        general_filter!($f, $dsl_expr)
    };
    (@filter_macro boolean, $f:ident, $dsl_expr:expr) => {
        boolean_filter!($f, $dsl_expr)
    };
    (@filter_macro $custom_type:ty, $f:ident, $dsl_expr:expr) => {
        general_filter!($f, $dsl_expr)
    };
}

macro_rules! diesel_string_enum {
    (
        $(#[$meta:meta])*
        $vis:vis enum $name:ident {
            $(
                $(#[$variant_meta:meta])*
                $variant:ident
            ),* $(,)?
        }
    ) => {
        #[derive(
            strum::AsRefStr,
            strum::EnumString,
            strum::Display,
            Debug,
            Clone,
            PartialEq,
            Eq,
            diesel::expression::AsExpression,
            Default,
        )]
        #[strum(serialize_all = "snake_case")]
        #[diesel(sql_type = diesel::sql_types::Text)]
        $(#[$meta])*
        $vis enum $name {
            $(
                $(#[$variant_meta])*
                $variant
            ),*
        }

        impl From<String> for $name {
            fn from(value: String) -> Self {
                use std::str::FromStr;
                Self::from_str(&value).unwrap()
            }
        }

        impl diesel::serialize::ToSql<diesel::sql_types::Text, diesel::sqlite::Sqlite> for $name
        where
            str: diesel::serialize::ToSql<diesel::sql_types::Text, diesel::sqlite::Sqlite>,
        {
            fn to_sql<'b>(
                &'b self,
                out: &mut diesel::serialize::Output<'b, '_, diesel::sqlite::Sqlite>,
            ) -> diesel::serialize::Result {
                <str as
                 diesel::serialize::ToSql<diesel::sql_types::Text, diesel::sqlite::Sqlite>>::to_sql(
                    self.as_ref(),
                    out,
                )
            }
        }
    };
}

pub(crate) use boolean_filter;
pub(crate) use create_condition;
pub(crate) use diesel_string_enum;
pub(crate) use general_filter;
pub(crate) use number_filter;
