import Locale from "../locales";
import { useState, useEffect } from "react";
import { Dataset, useDatasetStore } from "../store/dataset";
import LoadingIcon from "../icons/loading.svg";
import { IconButton } from "../components/button";
import dynamic from "next/dynamic";
import { showConfirm } from "../components/ui-lib";

const Markdown = dynamic(
  async () => (await import("../components/markdown")).Markdown,
  {
    loading: () => <LoadingIcon />,
  },
);

export function EditSchema(props: { dataset: Dataset }) {
  const { dataset } = props;
  const schema_prompt = dataset.gen_schema_prompt
    ? dataset.gen_schema_prompt
    : dataset.schema_prompt;
  const [text, setText] = useState(schema_prompt ? schema_prompt : "");
  const [isDiff, setIsDiff] = useState(false);
  const [preview, setPreview] = useState(dataset.gen_schema_status);
  const [loading, setLoading] = useState(dataset.gen_schema_status);
  const [previewBtn, setPreviewBtn] = useState(false);
  const [saving, setSaving] = useState(false);
  const store = useDatasetStore();

  const showEditBtn = preview && !loading;
  const showPreviewBtn = previewBtn && !preview;
  const showSaveBtn = !loading;

  const update_schema_status = (collection_name: string) => {
    const _t = setTimeout(() => {
      clearTimeout(_t);
      if (preview) {
        const d = store.find_dataset(collection_name);
        setText(d?.gen_schema_prompt as string);
        setLoading(d?.gen_schema_status as boolean);
      }
      if (dataset.gen_schema_status) {
        update_schema_status(collection_name);
      }
    }, 3000);
  };

  const onInput = (value: string) => {
    setText(value);
  };

  const text_diff = (collection_name: string) => {
    const d = store.find_dataset(collection_name);
    const same_text = !(d?.schema_prompt == text);
    setIsDiff(same_text);
  };

  const gen_schema = async (collection_name: string) => {
    setPreview(true);
    setLoading(true);
    const [_, schema] = await store.gen_schema(collection_name);
    text_diff(collection_name);
    setText(schema as string);
    setLoading(false);
  };

  const save_schema = async (collection_name: string, text: string) => {
    setSaving(true);
    await store.save_schema(collection_name, text);
    setSaving(false);
    setIsDiff(false);
  };

  useEffect(() => {
    const noText = text && text.length == 0;
    setPreviewBtn(!noText);
    text_diff(dataset.collection_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    update_schema_status(dataset.collection_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              onClick={async () => {
                if (
                  await showConfirm(Locale.Dataset.EditSchema.GenBtnConfirm)
                ) {
                  await gen_schema(dataset.collection_name);
                }
              }}
              text={
                loading
                  ? Locale.Dataset.EditSchema.Generating
                  : Locale.Dataset.EditSchema.GenBtn
              }
              disabled={loading}
            />
          </div>
          {showPreviewBtn && (
            <div className="window-action-button">
              <IconButton
                onClick={() => {
                  setPreview(true);
                }}
                text={Locale.Dataset.EditSchema.PreviewMode}
              />
            </div>
          )}
          {showEditBtn && (
            <div className="window-action-button">
              <IconButton
                onClick={() => {
                  setPreview(false);
                }}
                text={Locale.Dataset.EditSchema.EditMode}
              />
            </div>
          )}
        </div>

        {showSaveBtn && (
          <div className="window-actions" style={{ float: "right" }}>
            <div className="window-action-button">
              {isDiff && (
                <IconButton
                  type="danger"
                  onClick={async () => {
                    await save_schema(dataset.collection_name, text);
                  }}
                  text={
                    saving
                      ? Locale.Dataset.EditSchema.Saving
                      : Locale.Dataset.EditSchema.Save
                  }
                  disabled={saving}
                />
              )}
              {!isDiff && (
                <IconButton
                  type="primary"
                  onClick={async () => {
                    await save_schema(dataset.collection_name, text);
                  }}
                  text={
                    saving
                      ? Locale.Dataset.EditSchema.Saving
                      : Locale.Dataset.EditSchema.Save
                  }
                  disabled={saving}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {preview && <Markdown content={text} loading={loading} />}
      {!preview && (
        <textarea
          value={text}
          onInput={(e) => onInput(e.currentTarget.value)}
          rows={12}
          style={{ height: "100%", width: "99%" }}
        />
      )}
    </>
  );
}
