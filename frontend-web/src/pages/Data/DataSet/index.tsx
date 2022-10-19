import React, { useLayoutEffect, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import { useAlert } from 'react-alert';
import PageContainer from '@/components/PageContainer';
import PageTitleBox from '@/components/PageTitleBox';
import SubmitButton from '@/components/button/SubmitButton';
import ConfirmCancelButton from '@/components/button/ConfirmCancelButton';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/snippets/mysql';
import 'ace-builds/src-min-noconflict/ext-language_tools';
import DataGrid from '@/components/datagrid';
import DatabaseService from '@/api/databaseService';
import DatasetService from '@/api/datasetService';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { STATUS } from '@/constant';

const DataSet = () => {
  const { setId, sourceId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState({ databaseId: sourceId, title: '', query: '' });
  // 'select A.*, C.bizId from UserInfo A, BizUserMap B, BizInfo C where A.userId = B.userId and B.bizId = C.bizId',
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const alert = useAlert();

  useLayoutEffect(() => {
    console.log('modify', pathname.indexOf('modify'));
    console.log('setId', setId);
    console.log('sourceId', sourceId);

    if (pathname.indexOf('modify') > 0 && setId) {
      // 데이터셋 수정일 경우
      setIsModifyMode(true);
      getDatasetInfo();
    }
  }, []);

  /**
   * 데이터 그리드 컬럼 생성
   * @param data
   */
  const createColumns = data => {
    let target = null;
    if (data instanceof Array && data.length > 0) {
      target = data[0];
    } else if (data instanceof Object) {
      target = data;
    }
    const columns = Object.keys(target).map(key => {
      return { name: key, header: key, align: key, width: 200, sortable: true };
    });
    return columns;
  };

  const onLoad = e => {
    console.log(e);
  };

  const onChange = newValue => {
    console.log('change', newValue);
    setDatasetInfo(prevState => ({ ...prevState, query: newValue }));
  };

  const onChangeTitle = event => {
    console.log('onChangeTitle', event.target.value);
    setDatasetInfo(prevState => ({ ...prevState, title: event.target.value }));
  };

  /**
   * 수정일 경우 데이터셋 정보 조회
   */
  const getDatasetInfo = () => {
    DatasetService.selectDataset(setId).then(response => {
      console.log('selectDataset', response.data);
      if (response.data.status === 'SUCCESS') {
        setDatasetInfo(response.data.data);
      }
    });
  };

  /**
   * 쿼리 실행
   */
  const excuteQuery = () => {
    const param = {
      id: 1,
      query: datasetInfo.query,
    };
    console.log('param', param);
    DatabaseService.executeQuery(param)
      .then(response => {
        console.log(response.data);
        if (response.data.status === 'SUCCESS') {
          setData(response.data.datas);
          setTestCompleted(true);
          setColumns(createColumns(response.data.datas));
        } else {
          setTestCompleted(false);
        }
      })
      .catch(() => {
        setTestCompleted(false);
      });
  };

  const saveDataset = event => {
    event.preventDefault();
    console.log('저장', datasetInfo);

    alert.success(`데이터셋을 ${isModifyMode ? '수정' : '생성'}하시겠습니까?`, {
      closeCopy: '취소',
      actions: [
        {
          copy: '확인',
          onClick: () => {
            if (isModifyMode) {
              DatasetService.updateDataset(setId, datasetInfo).then(response => {
                console.log(response.data);
                if (response.data.status === STATUS.SUCCESS) {
                  alert.info('데이터셋이 수정되었습니다.', {
                    onClose: () => {
                      navigate('/data');
                    },
                  });
                }
              });
            } else {
              DatasetService.createDataset(datasetInfo).then(response => {
                console.log(response.data);
                if (response.data.status === STATUS.SUCCESS) {
                  alert.info('데이터셋이 생성되었습니다.', {
                    onClose: () => {
                      navigate('/data');
                    },
                  });
                }
              });
            }
          },
        },
      ],
    });
  };

  const handleCancel = () => {
    console.log('취소');
    navigate('/data');
  };

  return (
    <PageContainer>
      <PageTitleBox
        title={`데이터셋 ${isModifyMode ? '수정' : '생성'}`}
        button={
          <Stack>
            <ConfirmCancelButton
              cancelLabel="이전"
              cancelProps={{
                onClick: handleCancel,
              }}
              confirmLabel="저장"
              confirmProps={{
                disabled: !testCompleted,
                form: 'datasetForm',
                type: 'submit',
                variant: 'contained',
              }}
            />
          </Stack>
        }
      >
        <Stack
          id="datasetForm"
          component="form"
          flexDirection="column"
          spacing={3}
          sx={{ width: '100%' }}
          onSubmit={saveDataset}
        >
          <TextField
            id="userSetName"
            label="데이터셋 이름"
            placeholder="데이터셋의 이름을 입력해 주세요"
            value={datasetInfo?.title}
            onChange={onChangeTitle}
            autoFocus
            required
            // helperText="데이터셋의 이름을 입력해 주세요"
          />
          <AceEditor
            placeholder="Please enter a query."
            style={{ width: '100%', height: '200px' }}
            mode="mysql"
            theme="tomorrow"
            name="codeInput"
            onLoad={onLoad}
            onChange={onChange}
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={datasetInfo.query}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
          <SubmitButton label="Run" type="button" onClick={excuteQuery} />
          <DataGrid
            minBodyHeight={300}
            bodyHeight={500}
            data={data}
            columns={columns}
            columnOptions={{
              resizable: true,
            }}
          />
        </Stack>
      </PageTitleBox>
    </PageContainer>
  );
};

export default DataSet;
